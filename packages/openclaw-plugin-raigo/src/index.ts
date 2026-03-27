/**
 * @periculo/openclaw-plugin-raigo
 *
 * OpenClaw plugin that enforces raigo AI governance policy via the
 * before_tool_call hook. Every tool call is evaluated against the
 * raigo engine before execution. DENY decisions block the call entirely;
 * WARN decisions allow it through with a warning in agent context.
 *
 * @see https://raigo.ai/docs/openclaw
 * @see https://github.com/PericuloLimited/raigo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RaigoPluginConfig {
  /** Your raigo engine base URL, e.g. https://cloud.raigo.ai/v1 */
  engineUrl: string;
  /** Bearer token from your raigo cloud API Keys page */
  apiKey: string;
  /** Timeout in milliseconds for engine requests. Default: 3000 */
  timeoutMs?: number;
  /** If true, log all ALLOW decisions to console. Default: false */
  verbose?: boolean;
  /** If true, allow tool calls when the engine is unreachable. Default: true */
  failOpen?: boolean;
  /**
   * Optional callback fired on every WARN or DENY decision.
   * Use this to push alerts to your own systems (Slack, PagerDuty, etc.)
   * in addition to the automatic logging in raigo cloud.
   */
  onViolation?: (event: ViolationEvent) => void | Promise<void>;
}

export interface ViolationEvent {
  action: "WARN" | "DENY";
  toolName: string;
  ruleId?: string;
  ruleName?: string;
  severity?: string;
  complianceRefs?: string[];
  message?: string;
  agentId?: string;
  channel?: string;
  processingMs?: number;
  timestamp: string;
}

export interface EvaluateRequest {
  prompt: string;
  context?: {
    tool?: string;
    tool_name?: string;
    channel?: string;
    agent_id?: string;
    [key: string]: unknown;
  };
}

export interface EvaluateResponse {
  action: "ALLOW" | "WARN" | "DENY";
  message?: string;
  ruleId?: string;
  ruleName?: string;
  severity?: string;
  complianceRefs?: string[];
  processingMs?: number;
}

export interface ToolCallContext {
  toolName: string;
  input: unknown;
  channel?: string;
  agentId?: string;
  [key: string]: unknown;
}

export interface HookResult {
  block: boolean;
  message?: string;
  warning?: string;
}

// ── Core evaluator ────────────────────────────────────────────────────────────

export class RaigoEnforcer {
  private config: Required<RaigoPluginConfig>;

  constructor(config: RaigoPluginConfig) {
    this.config = {
      timeoutMs: 3000,
      verbose: false,
      failOpen: true,
      ...config,
    };

    if (!this.config.engineUrl) throw new Error("[raigo] engineUrl is required");
    if (!this.config.apiKey) throw new Error("[raigo] apiKey is required");

    // Normalise: strip trailing slash
    this.config.engineUrl = this.config.engineUrl.replace(/\/$/, "");
  }

  /**
   * Evaluate a prompt against the raigo engine.
   * Returns the raw EvaluateResponse, or null if the engine is unreachable
   * and failOpen is true.
   */
  async evaluate(req: EvaluateRequest): Promise<EvaluateResponse | null> {
    const url = `${this.config.engineUrl}/evaluate`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "@periculo/openclaw-plugin-raigo/1.0.0",
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`[raigo] Engine returned ${res.status}: ${text}`);
      }

      return (await res.json()) as EvaluateResponse;
    } catch (err) {
      if (this.config.failOpen) {
        console.warn(`[raigo] Engine unreachable, failing open: ${(err as Error).message}`);
        return null;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * The before_tool_call hook handler.
   * Returns { block: true } to prevent the tool call, or { block: false }
   * with an optional warning to append to agent context.
   */
  async beforeToolCall(ctx: ToolCallContext): Promise<HookResult> {
    // Build a human-readable prompt describing the tool call
    const prompt = buildPrompt(ctx);

    const result = await this.evaluate({
      prompt,
      context: {
        tool: "openclaw",
        tool_name: ctx.toolName,
        channel: ctx.channel,
        agent_id: ctx.agentId,
      },
    });

    // Engine unreachable + failOpen → allow through
    if (result === null) {
      return { block: false };
    }

    if (this.config.verbose || result.action !== "ALLOW") {
      console.log(
        `[raigo] ${result.action} tool=${ctx.toolName}` +
        (result.ruleId ? ` rule=${result.ruleId}` : "") +
        (result.processingMs ? ` (${result.processingMs}ms)` : "")
      );
    }

    // Fire onViolation callback for WARN/DENY
    if (result.action !== "ALLOW" && this.config.onViolation) {
      const event: ViolationEvent = {
        action: result.action as "WARN" | "DENY",
        toolName: ctx.toolName,
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        severity: result.severity,
        complianceRefs: result.complianceRefs,
        message: result.message,
        agentId: ctx.agentId,
        channel: ctx.channel,
        processingMs: result.processingMs,
        timestamp: new Date().toISOString(),
      };
      // Fire and forget — don't block the hook on callback errors
      Promise.resolve(this.config.onViolation(event)).catch((err) =>
        console.warn("[raigo] onViolation callback error:", err)
      );
    }

    switch (result.action) {
      case "DENY":
        return {
          block: true,
          message: result.message ?? `[raigo] Tool call blocked by policy${result.ruleId ? ` (${result.ruleId})` : ""}.`,
        };
      case "WARN":
        return {
          block: false,
          warning: result.message ?? `[raigo] Policy warning${result.ruleId ? ` (${result.ruleId})` : ""}: proceed with caution.`,
        };
      case "ALLOW":
      default:
        return { block: false };
    }
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: ToolCallContext): string {
  const inputStr = typeof ctx.input === "string"
    ? ctx.input
    : JSON.stringify(ctx.input, null, 2);

  return `Tool call: ${ctx.toolName}\nInput: ${inputStr}`;
}

// ── OpenClaw plugin factory ───────────────────────────────────────────────────

/**
 * Create a raigo OpenClaw plugin object.
 *
 * Usage in openclaw.json:
 * ```json
 * {
 *   "plugins": {
 *     "entries": {
 *       "raigo": {
 *         "enabled": true,
 *         "config": {
 *           "engineUrl": "https://cloud.raigo.ai/v1",
 *           "apiKey": "rgo_live_..."
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export function createRaigoPlugin(config: RaigoPluginConfig) {
  const enforcer = new RaigoEnforcer(config);

  return {
    name: "@periculo/openclaw-plugin-raigo",
    version: "1.0.0",

    hooks: {
      /**
       * Fires before every tool call. Returning { block: true } prevents
       * the tool from executing. Returning { warning } appends the warning
       * to the agent's context window.
       */
      before_tool_call: async (ctx: ToolCallContext): Promise<HookResult> => {
        return enforcer.beforeToolCall(ctx);
      },
    },
  };
}

// Default export for OpenClaw plugin loader
export default createRaigoPlugin;
