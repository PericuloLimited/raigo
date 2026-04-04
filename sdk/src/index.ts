/**
 * @raigo/sdk
 *
 * Official TypeScript/JavaScript SDK for raigo Cloud.
 *
 * Usage:
 *   import { RaigoClient } from '@raigo/sdk';
 *
 *   const raigo = new RaigoClient({ apiKey: process.env.RAIGO_API_KEY });
 *
 *   // Simple evaluate — returns immediately with ALLOW, DENY, or WARN
 *   const result = await raigo.evaluate({ prompt: 'Delete all records' });
 *
 *   // Evaluate with human-in-the-loop — blocks until a human approves or denies
 *   const result = await raigo.evaluateAndWait({ prompt: 'Transfer £50,000' });
 *   if (!result.allow) {
 *     throw new Error(result.policyMessage ?? 'Action blocked by policy');
 *   }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three canonical verdicts the raigo engine can return. */
export type EvalAction = 'ALLOW' | 'DENY' | 'WARN';

/** The status of a human-in-the-loop approval record. */
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

/** Context passed alongside a prompt to provide richer evaluation signals. */
export interface EvalContext {
  agent?: string;
  session?: string;
  tool?: string;
  tool_invocation?: string;
  action?: string;
  command?: string;
  data_classification?: string[];
  environment?: string;
  destination?: string;
  language?: string;
  anomaly_types?: string[];
  url?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

/** The request body sent to the evaluate endpoint. */
export interface EvalRequest {
  prompt?: string;
  content?: string;
  context?: EvalContext;
  metadata?: Record<string, unknown>;
}

/** A single policy violation detail. */
export interface PolicyViolation {
  rule_id: string;
  rule_title: string;
  error_code: string;
  http_status: number;
  action: 'DENY' | 'WARN';
  require_approval?: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  user_message: string;
  developer_message: string;
  debug_hint: string;
  compliance_mapping?: Array<{
    framework: string;
    control: string;
    description?: string;
  }>;
  audit_log: {
    timestamp: string;
    rule_id: string;
    action: string;
    severity: string;
    organisation: string;
    policy_suite: string;
    policy_version: string;
  };
}

/** The response from a synchronous evaluate call. */
export interface EvalResponse {
  allow: boolean;
  action: EvalAction;
  evaluated_rules: number;
  triggered_rules: string[];
  violation?: PolicyViolation;
  warnings?: PolicyViolation[];
  evaluation_time_ms: number;
  policy_version: string;
  organisation: string;
  /**
   * Present when action is DENY and the matched rule uses require_approval.
   * When raigo Cloud has humanInLoopOnBlock enabled, the cloud layer creates
   * an approval record. Use evaluateAndWait() to automatically poll for
   * the human decision.
   */
  requires_approval?: boolean;
  /**
   * Present when action is DENY and humanInLoopOnBlock is enabled on the org.
   * The agent should poll GET /v1/approvals/{approvalId} for the decision,
   * or use evaluateAndWait() which handles this automatically.
   */
  approvalId?: string;
  /** Human-readable policy message (from the violation or warning). */
  policyMessage?: string;
}

/** The response from polling an approval record. */
export interface ApprovalPollResponse {
  id: string;
  status: ApprovalStatus;
  allow: boolean;
  reviewerNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/** Options for evaluateAndWait(). */
export interface EvaluateAndWaitOptions extends EvalRequest {
  /**
   * How long to poll for a human decision before timing out (ms).
   * Defaults to 300_000 (5 minutes).
   */
  timeoutMs?: number;
  /**
   * How often to poll the approval endpoint (ms).
   * Defaults to 3_000 (3 seconds).
   */
  pollIntervalMs?: number;
  /**
   * Called each time the approval status is polled while still pending.
   */
  onPending?: (approvalId: string, elapsedMs: number) => void;
}

/** Configuration for the RaigoClient. */
export interface RaigoClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class RaigoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RaigoApiError';
  }
}

export class RaigoApprovalTimeoutError extends Error {
  constructor(
    public readonly approvalId: string,
    public readonly elapsedMs: number,
  ) {
    super(
      `Approval ${approvalId} timed out after ${Math.round(elapsedMs / 1000)}s waiting for human decision.`,
    );
    this.name = 'RaigoApprovalTimeoutError';
  }
}

export class RaigoApprovalDeniedError extends Error {
  constructor(
    public readonly approvalId: string,
    public readonly reviewerNote?: string,
  ) {
    super(
      `Approval ${approvalId} was denied by reviewer.${reviewerNote ? ` Note: ${reviewerNote}` : ''}`,
    );
    this.name = 'RaigoApprovalDeniedError';
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class RaigoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: RaigoClientConfig = {}) {
    const apiKey = config.apiKey ?? (typeof process !== 'undefined' ? process.env['RAIGO_API_KEY'] : undefined);
    if (!apiKey) {
      throw new Error(
        'raigo API key is required. Pass it as apiKey in the config or set the RAIGO_API_KEY environment variable.',
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://raigocloud.manus.space').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  private async fetchJson<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      timeoutMs?: number;
    } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? this.timeoutMs,
    );

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new RaigoApiError(
          response.status,
          (data['code'] as string) ?? 'UNKNOWN_ERROR',
          (data['message'] as string) ?? `HTTP ${response.status}`,
        );
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Evaluate a prompt or action against your raigo policy.
   *
   * Returns immediately with a verdict of ALLOW, DENY, or WARN.
   *
   * If the result is DENY and requires_approval is true, the cloud has
   * created an approval record. You can either:
   * - Handle the approval flow yourself using pollApproval(result.approvalId)
   * - Use evaluateAndWait() which handles polling automatically
   */
  async evaluate(request: EvalRequest): Promise<EvalResponse> {
    const raw = await this.fetchJson<EvalResponse>('/v1/evaluate', {
      method: 'POST',
      body: request,
    });

    const policyMessage =
      raw.violation?.user_message ??
      raw.warnings?.[0]?.user_message;

    return { ...raw, policyMessage };
  }

  /**
   * Evaluate a prompt and, if a human-in-the-loop approval is required,
   * block until the reviewer approves or denies.
   *
   * This is the recommended method for high-stakes agent actions where your
   * organisation has enabled humanInLoopOnBlock in raigo Cloud.
   *
   * Flow:
   * 1. Calls /v1/evaluate — returns immediately
   * 2. If action === 'ALLOW' or 'WARN': resolves immediately
   * 3. If action === 'DENY' without approvalId: returns (block is immediate)
   * 4. If action === 'DENY' with approvalId: polls /v1/approvals/{id} until:
   *    - Status is 'approved' -> resolves with allow: true
   *    - Status is 'denied' -> throws RaigoApprovalDeniedError
   *    - Timeout reached -> throws RaigoApprovalTimeoutError
   *
   * Important: An approved record means the human granted a one-time override.
   * The original DENY verdict is preserved in the audit log as
   * "DENY (human override)". This is not an ALLOW — it is an exception.
   */
  async evaluateAndWait(options: EvaluateAndWaitOptions): Promise<EvalResponse> {
    const {
      timeoutMs = 300_000,
      pollIntervalMs = 3_000,
      onPending,
      ...request
    } = options;

    const result = await this.evaluate(request);

    if (result.action !== 'DENY') {
      return result;
    }

    if (!result.approvalId) {
      return result;
    }

    const approvalId = result.approvalId;
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeoutMs) {
        throw new RaigoApprovalTimeoutError(approvalId, elapsed);
      }

      const poll = await this.pollApproval(approvalId);

      if (poll.status === 'approved') {
        return { ...result, allow: true };
      }

      if (poll.status === 'denied') {
        throw new RaigoApprovalDeniedError(approvalId, poll.reviewerNote);
      }

      if (poll.status === 'expired') {
        throw new RaigoApprovalTimeoutError(approvalId, elapsed);
      }

      onPending?.(approvalId, elapsed);
      await sleep(pollIntervalMs);
    }
  }

  /**
   * Poll the status of a specific approval record.
   */
  async pollApproval(approvalId: string): Promise<ApprovalPollResponse> {
    return this.fetchJson<ApprovalPollResponse>(`/v1/approvals/${approvalId}`);
  }

  /**
   * Check the health of the raigo Cloud API.
   */
  async health(): Promise<{ status: string; version: string }> {
    return this.fetchJson('/v1/health');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Convenience factory ──────────────────────────────────────────────────────

export function createClient(config?: RaigoClientConfig): RaigoClient {
  return new RaigoClient(config);
}

export default RaigoClient;
