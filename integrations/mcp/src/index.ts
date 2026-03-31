#!/usr/bin/env node
/**
 * RAIGO MCP Server
 *
 * Exposes the raigo policy engine as MCP tools for any compatible agent:
 * Claude Desktop, Cursor, Windsurf, Hermes, and any other MCP client.
 *
 * Tools:
 *   raigo_evaluate      — evaluate a prompt/action against your raigo policy
 *   raigo_check_balance — check remaining credits on your raigo Cloud account
 *
 * Configuration (environment variables):
 *   RAIGO_API_KEY    — your raigo Cloud API key (required)
 *   RAIGO_ENDPOINT   — raigo evaluate endpoint (default: https://cloud.raigo.ai/v1/evaluate)
 *
 * Usage:
 *   npx @raigo/mcp-server
 *   RAIGO_API_KEY=your_key npx @raigo/mcp-server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Configuration ────────────────────────────────────────────────────────────

const RAIGO_API_KEY = process.env.RAIGO_API_KEY ?? "";
const RAIGO_ENDPOINT =
  process.env.RAIGO_ENDPOINT ?? "https://cloud.raigo.ai/v1/evaluate";
const RAIGO_BALANCE_ENDPOINT =
  process.env.RAIGO_BALANCE_ENDPOINT ??
  "https://cloud.raigo.ai/v1/balance";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RaigoEvaluateResponse {
  action: "ALLOW" | "DENY" | "WARN";
  ruleId?: string;
  ruleName?: string;
  severity?: string;
  policyMessage?: string;
  userMessage?: string;
  creditsRemaining?: number;
}

interface RaigoBalanceResponse {
  creditsBalance: number;
  creditsUsed: number;
  plan?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callRaigoEvaluate(
  prompt: string,
  context?: string
): Promise<RaigoEvaluateResponse> {
  if (!RAIGO_API_KEY) {
    throw new Error(
      "RAIGO_API_KEY environment variable is not set. " +
        "Get your API key from https://cloud.raigo.ai → Integrations."
    );
  }

  const body: Record<string, string> = { prompt };
  if (context) body.context = context;

  const response = await fetch(RAIGO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RAIGO_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 402) {
    return {
      action: "DENY",
      ruleId: "CREDITS-EXHAUSTED",
      ruleName: "Insufficient Credits",
      severity: "critical",
      policyMessage:
        "Your raigo Cloud credit balance is zero. Top up at https://cloud.raigo.ai/billing to continue.",
      userMessage:
        "Policy evaluation is paused — your raigo Cloud credits have been exhausted. Please top up at cloud.raigo.ai.",
    };
  }

  if (!response.ok) {
    throw new Error(
      `raigo API returned ${response.status}: ${await response.text()}`
    );
  }

  return response.json() as Promise<RaigoEvaluateResponse>;
}

async function callRaigoBalance(): Promise<RaigoBalanceResponse> {
  if (!RAIGO_API_KEY) {
    throw new Error(
      "RAIGO_API_KEY environment variable is not set. " +
        "Get your API key from https://cloud.raigo.ai → Integrations."
    );
  }

  const response = await fetch(RAIGO_BALANCE_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${RAIGO_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `raigo API returned ${response.status}: ${await response.text()}`
    );
  }

  return response.json() as Promise<RaigoBalanceResponse>;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatEvaluateResult(result: RaigoEvaluateResponse): string {
  const icon =
    result.action === "ALLOW"
      ? "✅"
      : result.action === "DENY"
        ? "🛡️"
        : "⚠️";

  const lines: string[] = [
    `${icon} **RAIGO: ${result.action}**`,
    "",
  ];

  if (result.ruleId) {
    lines.push(`**Rule:** ${result.ruleId}${result.ruleName ? ` — ${result.ruleName}` : ""}`);
  }
  if (result.severity) {
    lines.push(`**Severity:** ${result.severity.toUpperCase()}`);
  }
  if (result.policyMessage) {
    lines.push(`**Policy:** ${result.policyMessage}`);
  }
  if (result.userMessage) {
    lines.push(`**Message:** ${result.userMessage}`);
  }
  if (result.creditsRemaining !== undefined) {
    lines.push(`**Credits remaining:** ${result.creditsRemaining.toLocaleString()}`);
  }

  if (result.action === "ALLOW") {
    lines.push("", "This action is permitted by your organisation's policy.");
  } else if (result.action === "DENY") {
    lines.push(
      "",
      "**This action is blocked by your organisation's policy. Do not proceed.**"
    );
  } else if (result.action === "WARN") {
    lines.push(
      "",
      "**This action requires explicit human confirmation before proceeding.** Present the policy message to the user and wait for their approval."
    );
  }

  return lines.join("\n");
}

function formatBalanceResult(result: RaigoBalanceResponse): string {
  const lines: string[] = [
    "💳 **RAIGO Cloud — Credit Balance**",
    "",
    `**Available:** ${result.creditsBalance.toLocaleString()} credits`,
    `**Used:** ${result.creditsUsed.toLocaleString()} credits`,
  ];

  if (result.plan) {
    lines.push(`**Plan:** ${result.plan}`);
  }

  if (result.creditsBalance === 0) {
    lines.push(
      "",
      "⚠️ **Your credit balance is zero.** Policy evaluation is paused. Top up at https://cloud.raigo.ai/billing"
    );
  } else if (result.creditsBalance < 100) {
    lines.push(
      "",
      `⚠️ **Low balance warning:** only ${result.creditsBalance} credits remaining. Top up at https://cloud.raigo.ai/billing`
    );
  }

  return lines.join("\n");
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "raigo",
  version: "1.0.0",
});

// Tool: raigo_evaluate
server.tool(
  "raigo_evaluate",
  "Evaluate a prompt or proposed action against your organisation's raigo AI policy engine. " +
    "Returns ALLOW, DENY, or WARN with the matching rule ID, severity, and policy message. " +
    "MUST be called before any sensitive action: executing code, making external API calls, " +
    "handling personal data, sending messages, deleting data, or any irreversible operation. " +
    "If the result is DENY, do not proceed. If WARN, present the message to the user and wait for explicit confirmation.",
  {
    prompt: z
      .string()
      .min(1)
      .describe(
        "The prompt, instruction, or description of the action to evaluate. " +
          "Be specific — include what action will be taken, what data is involved, " +
          "and any relevant context (e.g. 'Send API key abc123 to user craig via Slack')."
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Optional additional context about the current session, user role, or task. " +
          "Helps the policy engine make more accurate decisions."
      ),
  },
  async ({ prompt, context }) => {
    try {
      const result = await callRaigoEvaluate(prompt, context);
      return {
        content: [
          {
            type: "text",
            text: formatEvaluateResult(result),
          },
        ],
        // Surface the raw result as structured data for programmatic use
        isError: result.action === "DENY",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error calling raigo API";
      return {
        content: [
          {
            type: "text",
            text: `❌ **RAIGO ERROR:** ${message}\n\nFalling back to default-deny. Do not proceed with the action until raigo is reachable.`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: raigo_check_balance
server.tool(
  "raigo_check_balance",
  "Check the current credit balance on your raigo Cloud account. " +
    "Each call to raigo_evaluate deducts 1 credit. " +
    "Use this to verify your account is active before starting a long task.",
  {},
  async () => {
    try {
      const result = await callRaigoBalance();
      return {
        content: [
          {
            type: "text",
            text: formatBalanceResult(result),
          },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error calling raigo API";
      return {
        content: [
          {
            type: "text",
            text: `❌ **RAIGO ERROR:** ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't interfere with the MCP stdio protocol
  process.stderr.write(
    "raigo MCP server started. Waiting for connections...\n"
  );
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
