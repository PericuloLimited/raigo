/**
 * RAIGO Agent Firewall — OpenClaw Hook Handler
 *
 * Fires on message:received to screen inbound messages against the RAIGO policy
 * before the agent processes them. This is the early warning layer.
 *
 * The primary enforcement layer is the RAIGO SKILL.md, which instructs the agent
 * to call the RAIGO Engine before executing any sensitive action.
 *
 * @see https://raigo.ai/docs/openclaw
 * @see https://docs.openclaw.ai/automation/hooks
 */

import { execSync } from "child_process";

// ─── Configuration ────────────────────────────────────────────────────────────

const ENGINE_URL = process.env.RAIGO_ENGINE_URL ?? "http://localhost:8181";
const FAIL_OPEN = process.env.RAIGO_FAIL_OPEN === "true";
const TIMEOUT_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RaigoEvaluateResponse {
  action: "ALLOW" | "DENY" | "WARN";
  http_status?: number;
  error_code?: string;
  user_message?: string;
  developer_message?: string;
  triggered_rules?: string[];
  audit_log?: {
    timestamp: string;
    rule_id: string;
    severity: string;
  };
}

// ─── Engine Call ─────────────────────────────────────────────────────────────

async function evaluateWithRaigo(
  prompt: string,
  channelId: string
): Promise<RaigoEvaluateResponse | null> {
  try {
    const payload = JSON.stringify({
      prompt,
      context: {
        tool: "openclaw",
        channel: channelId,
        environment: "production",
        hook: "message:received",
      },
    });

    // Use curl for maximum compatibility — no Node.js fetch dependency issues
    const result = execSync(
      `curl -s --max-time ${TIMEOUT_MS / 1000} -X POST ${ENGINE_URL}/v1/evaluate ` +
        `-H "Content-Type: application/json" ` +
        `-d '${payload.replace(/'/g, "'\\''")}'`,
      { timeout: TIMEOUT_MS + 500, encoding: "utf8" }
    );

    return JSON.parse(result) as RaigoEvaluateResponse;
  } catch {
    // Engine unreachable or parse error
    return null;
  }
}

// ─── Hook Handler ─────────────────────────────────────────────────────────────

const handler = async (event: {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: {
    from?: string;
    content?: string;
    channelId?: string;
    conversationId?: string;
  };
}): Promise<void> => {
  // Only handle inbound messages
  if (event.type !== "message" || event.action !== "received") {
    return;
  }

  const content = event.context.content;
  const channelId = event.context.channelId ?? "unknown";

  // Skip empty messages
  if (!content || content.trim().length === 0) {
    return;
  }

  // Skip very short messages (greetings, single words) — not worth evaluating
  if (content.trim().length < 10) {
    return;
  }

  const result = await evaluateWithRaigo(content, channelId);

  // Engine unreachable
  if (result === null) {
    if (!FAIL_OPEN) {
      event.messages.push(
        "⚠️ **RAIGO Agent Firewall is not running.** " +
          "Your agent is operating without policy enforcement. " +
          "Start the engine with: `raigo-engine ~/.openclaw/openclaw_af.raigo`"
      );
    }
    return;
  }

  // Policy violation — push warning to user
  if (result.action === "DENY") {
    const ruleId = result.triggered_rules?.[0] ?? result.error_code ?? "unknown";
    const userMsg =
      result.user_message ??
      "This message was blocked by your organisation's AI security policy.";

    event.messages.push(
      `🛡️ **RAIGO Agent Firewall — Request Blocked**\n\n` +
        `${userMsg}\n\n` +
        `Rule: \`${ruleId}\` | ` +
        `[View Policy](https://raigo.ai/docs/openclaw)`
    );

    console.log(
      `[raigo-af] DENY — rule: ${ruleId}, channel: ${channelId}, ` +
        `session: ${event.sessionKey}, ts: ${event.timestamp.toISOString()}`
    );
    return;
  }

  // Warning — notify user but allow through
  if (result.action === "WARN") {
    const ruleId = result.triggered_rules?.[0] ?? result.error_code ?? "unknown";
    const userMsg = result.user_message ?? "This message triggered a security warning.";

    event.messages.push(
      `⚠️ **RAIGO Agent Firewall — Security Notice**\n\n` +
        `${userMsg}\n\n` +
        `Rule: \`${ruleId}\``
    );

    console.log(
      `[raigo-af] WARN — rule: ${ruleId}, channel: ${channelId}, ` +
        `session: ${event.sessionKey}, ts: ${event.timestamp.toISOString()}`
    );
    return;
  }

  // ALLOW — silent, no message needed
  // Optionally log for audit trail (comment out if too verbose)
  // console.log(`[raigo-af] ALLOW — channel: ${channelId}, session: ${event.sessionKey}`);
};

export default handler;
