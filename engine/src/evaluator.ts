import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RaigoCondition {
  trigger?: string;
  // Data classification triggers
  data_classification?: string[];
  // Keyword matching (for prompt_contains / output_contains)
  keywords?: string[];
  match?: 'any' | 'all';
  // Environment / destination
  environment?: string[];
  destination?: string;
  // Code generation
  language?: string[];
  // Anomaly detection
  anomaly_types?: string[];
  // Tool invocation
  tool_not_in?: string[];
  // Action matching (for destructive command detection)
  action_types?: string[];
  // Pattern matching (regex)
  pattern?: string;
}

export interface ComplianceMapping {
  framework: string;
  control: string;
  description?: string;
}

export interface RaigoPolicy {
  id: string;
  domain: string;
  title: string;
  condition: string | RaigoCondition;
  action: 'DENY' | 'ENFORCE' | 'WARN';
  severity: 'critical' | 'high' | 'medium' | 'low';
  directive: string;
  enforcement_message: string;
  compliance_mapping?: ComplianceMapping[];
  audit_required?: boolean;
  human_review_required?: boolean;
  tags?: string[];
}

export interface RaigoMetadata {
  organisation: string;
  policy_suite: string;
  version: string;
  effective_date?: string;
  owner?: string;
  contact?: string;
}

export interface RaigoFile {
  raigo_version: string;
  metadata: RaigoMetadata;
  policies: RaigoPolicy[];
}

export interface EvaluationRequest {
  prompt?: string;
  content?: string;
  context?: {
    action?: string;
    command?: string;
    type?: string;
    tool?: string;
    data_classification?: string[];
    environment?: string;
    destination?: string;
    language?: string;
    anomaly_types?: string[];
    agent?: string;
    session?: string;
    url?: string;
    amount?: number;
    currency?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ViolationResponse {
  rule_id: string;
  rule_title: string;
  error_code: string;
  http_status: number;
  action: 'DENY' | 'WARN';
  severity: string;
  user_message: string;
  developer_message: string;
  debug_hint: string;
  compliance_mapping?: ComplianceMapping[];
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

export interface EvaluationResult {
  allow: boolean;
  action: 'ALLOW' | 'DENY' | 'WARN';
  evaluated_rules: number;
  triggered_rules: string[];
  violation?: ViolationResponse;
  warnings?: ViolationResponse[];
  evaluation_time_ms: number;
  policy_version: string;
  organisation: string;
}

// ─── Detection Pattern Libraries ─────────────────────────────────────────────

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,                          // SSN
  /\b[A-Z]{2}\d{6}[A-Z]\b/,                          // UK NHS number style
  /\b\d{10}\b/,                                       // NHS number
  /\bNHS\s*number\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\bpassport\s+number\b/i,
  /\bNI\s*number\b/i,
  /\b[A-Z]{2}\s?\d{6}\s?[A-Z]\b/,                   // NI number
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,    // Credit card
  /\bpatient\s+(id|number|record)\b/i,
  /\bmedical\s+record\b/i,
  /\bdiagnosis\b/i,
  /\bprescription\b/i,
  /\bblood\s+type\b/i,
  /\bemail\s+address\b/i,
  /\bhome\s+address\b/i,
  /\bphone\s+number\b/i,
  /\bmobile\s+number\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\bsort\s+code\b/i,
  /\baccount\s+number\b/i,
];

const PHI_PATTERNS = [
  /\bHIV\b/i,
  /\bcancer\b/i,
  /\bdiabetes\b/i,
  /\bclinical\s+notes?\b/i,
  /\bmedication\b/i,
  /\btreatment\s+plan\b/i,
  /\blab\s+results?\b/i,
  /\bpathology\b/i,
  /\bradiology\b/i,
];

const CLASSIFIED_PATTERNS = [
  /\bSECRET\b/,
  /\bTOP\s+SECRET\b/i,
  /\bCLASSIFIED\b/,
  /\bOFFICIAL[\s-]SENSITIVE\b/i,
  /\bCUI\b/,
  /\bFOR\s+OFFICIAL\s+USE\s+ONLY\b/i,
  /\bFOUO\b/,
  /\bNOFORN\b/,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /you\s+are\s+now\s+a\s+different/i,
  /act\s+as\s+if\s+you\s+(have\s+no|don.t\s+have)\s+(rules|restrictions|guidelines)/i,
  /jailbreak/i,
  /\bDAN\b.*mode/i,
  /\bDAN\b.*now/i,
  /you\s+are\s+now\s+DAN/i,
  /developer\s+mode\s+enabled/i,
  /pretend\s+you\s+(have\s+no|don.t\s+have)\s+(restrictions|rules|guidelines)/i,
  /you\s+have\s+no\s+(restrictions|rules|guidelines|limits)/i,
  /override\s+(your\s+)?(safety|security|guidelines|instructions)/i,
  /bypass\s+(your\s+)?(safety|security|guidelines|instructions)/i,
  /circumvent\s+(your\s+)?(safety|security|guidelines|instructions)/i,
  /system\s+prompt\s*:/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /admin\s+panel/i,
  /access\s+the\s+admin/i,
];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\bdelete\s+(all|every|the)\b/i,
  /\bdrop\s+(table|database|schema|collection)\b/i,
  /\btruncate\s+(table|database)\b/i,
  /\bwipe\s+(the\s+)?(database|disk|drive|server|data|backup|all)\b/i,
  /\bformat\s+(the\s+)?(disk|drive|partition|server)\b/i,
  /\brm\s+-rf?\b/i,
  /\bdel\s+\/[sf]\b/i,
  /\bkill\s+(all|every)\s+(process|service|container)\b/i,
  /\bshutdown\s+(the\s+)?(server|system|database)\b/i,
  /\bpurge\s+(all|every|the)\b/i,
  /\berase\s+(all|every|the)\b/i,
  /\bremove\s+all\b/i,
  /destroy\s+(the\s+)?(database|server|data|all)\b/i,
];

const FINANCIAL_ACTION_PATTERNS = [
  /\btransfer\s+[\$£€¥]?\s*[\d,]+/i,
  /\bsend\s+[\$£€¥]?\s*[\d,]+/i,
  /\bpay\s+[\$£€¥]?\s*[\d,]+/i,
  /\bwire\s+[\$£€¥]?\s*[\d,]+/i,
  /\bpurchase\s+[\$£€¥]?\s*[\d,]+/i,
  /\bbuy\s+[\$£€¥]?\s*[\d,]+/i,
  /\bwithdraw\s+[\$£€¥]?\s*[\d,]+/i,
  /\bdebit\s+[\$£€¥]?\s*[\d,]+/i,
  /\bcharge\s+[\$£€¥]?\s*[\d,]+/i,
  /\bsubscrib\w+\s+to\b/i,
  /\bsort\s+code\b/i,
  /\baccount\s+number\s+\d/i,
  /\bIBAN\b/i,
  /\bBIC\b/i,
  /\bSWIFT\b/i,
];

const EXTERNAL_CONTENT_EXECUTION_PATTERNS = [
  /execute\s+(the\s+)?(instructions?|commands?|code|script)\s+(it\s+)?(contains?|from|in)/i,
  /run\s+(the\s+)?(instructions?|commands?|code|script)\s+(it\s+)?(contains?|from|in)/i,
  /follow\s+(the\s+)?(instructions?|commands?|code|script)\s+(it\s+)?(contains?|from|in)/i,
  /eval(uate)?\s+(this|the)\s+(code|script|command)/i,
  /exec(ute)?\s+(this|the)\s+(code|script|command)/i,
  /shell\s+script/i,
  /bash\s+script/i,
  /powershell\s+script/i,
];

const PII_REQUEST_PATTERNS = [
  /\bemail\s+address\b/i,
  /\bphone\s+number\b/i,
  /\bhome\s+address\b/i,
  /\bpersonal\s+(details?|information|data)\b/i,
  /\bcontact\s+(details?|information)\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\bpassword\b/i,
  /\bcredit\s+card\b/i,
  /\bbank\s+(account|details?)\b/i,
  /\bsocial\s+security\b/i,
  /\bNHS\s+number\b/i,
  /\bNI\s+number\b/i,
  /\bpassport\b/i,
  /\bdriving\s+licen[cs]e\b/i,
];

// ─── Evaluator ────────────────────────────────────────────────────────────────

export class RaigoEvaluator {
  private policy: RaigoFile;
  private policyPath: string;

  constructor(policyPath: string) {
    this.policyPath = path.resolve(policyPath);
    this.policy = this.loadPolicy();
  }

  private loadPolicy(): RaigoFile {
    const raw = fs.readFileSync(this.policyPath, 'utf8');
    const parsed = yaml.load(raw) as RaigoFile;
    if (!parsed.policies || !Array.isArray(parsed.policies)) {
      throw new Error('Invalid .raigo file: missing policies array');
    }
    return parsed;
  }

  reload(): void {
    this.policy = this.loadPolicy();
  }

  getMetadata() {
    return this.policy.metadata;
  }

  getPolicies() {
    return this.policy.policies;
  }

  evaluate(request: EvaluationRequest): EvaluationResult {
    const start = Date.now();
    const content = [request.prompt, request.content].filter(Boolean).join(' ');
    const ctx = request.context || {};

    const triggered: ViolationResponse[] = [];

    for (const rule of this.policy.policies) {
      if (this.ruleMatches(rule, content, ctx)) {
        const vr = this.buildViolationResponse(rule);
        triggered.push(vr);
      }
    }

    const denials = triggered.filter(v => v.action === 'DENY');
    const warnings = triggered.filter(v => v.action === 'WARN');

    const elapsed = Date.now() - start;

    if (denials.length > 0) {
      const sorted = denials.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      });
      return {
        allow: false,
        action: 'DENY',
        evaluated_rules: this.policy.policies.length,
        triggered_rules: triggered.map(v => v.rule_id),
        violation: sorted[0],
        warnings: warnings.length > 0 ? warnings : undefined,
        evaluation_time_ms: elapsed,
        policy_version: this.policy.metadata.version,
        organisation: this.policy.metadata.organisation,
      };
    }

    if (warnings.length > 0) {
      return {
        allow: true,
        action: 'WARN',
        evaluated_rules: this.policy.policies.length,
        triggered_rules: warnings.map(v => v.rule_id),
        warnings,
        evaluation_time_ms: elapsed,
        policy_version: this.policy.metadata.version,
        organisation: this.policy.metadata.organisation,
      };
    }

    return {
      allow: true,
      action: 'ALLOW',
      evaluated_rules: this.policy.policies.length,
      triggered_rules: [],
      evaluation_time_ms: elapsed,
      policy_version: this.policy.metadata.version,
      organisation: this.policy.metadata.organisation,
    };
  }

  private ruleMatches(
    rule: RaigoPolicy,
    content: string,
    ctx: EvaluationRequest['context']
  ): boolean {
    const condition = rule.condition;

    // ── Simple string conditions ──────────────────────────────────────────────
    if (typeof condition === 'string') {
      const c = condition.toLowerCase();
      if (c === 'always') return true;
      if (c === 'code_generation') return ctx?.language !== undefined;
      if (c === 'data_transfer') return ctx?.destination !== undefined;
      if (c === 'prompt_injection') return this.containsPromptInjection(content);
      if (c === 'pii_detected') return this.containsPII(content) || this.containsPIIRequest(content);
      if (c === 'phi_detected') return this.containsPHI(content);
      if (c === 'destructive_action') return this.containsDestructiveCommand(content);
      if (c === 'financial_action') return this.containsFinancialAction(content);
      if (c === 'external_content') return this.containsExternalContentExecution(content);
      return false;
    }

    // ── Structured conditions ─────────────────────────────────────────────────
    const trigger = (condition.trigger || 'always').toLowerCase();

    if (trigger === 'always') return true;

    // ── prompt_contains / input_contains ─────────────────────────────────────
    // Matches if the prompt contains any (or all) of the specified keywords,
    // or if it matches known threat patterns for the data classification
    if (trigger === 'prompt_contains' || trigger === 'input_contains') {
      return this.evaluateContainsTrigger(condition, content, ctx, 'prompt');
    }

    // ── output_contains ───────────────────────────────────────────────────────
    if (trigger === 'output_contains') {
      return this.evaluateContainsTrigger(condition, content, ctx, 'output');
    }

    // ── anomaly_detected ──────────────────────────────────────────────────────
    if (trigger === 'anomaly_detected') {
      const anomalyTypes = condition.anomaly_types || [];
      for (const anomaly of anomalyTypes) {
        if (anomaly === 'prompt_injection' && this.containsPromptInjection(content)) return true;
        if (anomaly === 'jailbreak' && this.containsPromptInjection(content)) return true;
        if (anomaly === 'instruction_override' && this.containsPromptInjection(content)) return true;
        if (anomaly === 'destructive_action' && this.containsDestructiveCommand(content)) return true;
        if (anomaly === 'financial_action' && this.containsFinancialAction(content)) return true;
        if (anomaly === 'code_injection' && this.containsExternalContentExecution(content)) return true;
        if (anomaly === 'pii_detected' && (this.containsPII(content) || this.containsPIIRequest(content))) return true;
        if (anomaly === 'phi_detected' && this.containsPHI(content)) return true;
        if (ctx?.anomaly_types?.includes(anomaly)) return true;
      }
      return false;
    }

    // ── data_transfer ─────────────────────────────────────────────────────────
    if (trigger === 'data_transfer') {
      if (condition.destination && ctx?.destination) {
        if (condition.destination === 'outside_uk' && ctx.destination === 'outside_uk') return true;
        if (condition.destination === 'external' && ctx.destination === 'external') return true;
      }
      return false;
    }

    // ── code_generation ───────────────────────────────────────────────────────
    if (trigger === 'code_generation') {
      if (condition.language && ctx?.language) {
        return condition.language.includes(ctx.language);
      }
      return ctx?.language !== undefined;
    }

    // ── tool_invocation ───────────────────────────────────────────────────────
    // Fires when a tool is invoked that is NOT in the approved list
    if (trigger === 'tool_invocation') {
      if (condition.tool_not_in && ctx?.tool) {
        return !condition.tool_not_in.includes(ctx.tool);
      }
      // If no approved list is specified, fire on any tool invocation
      if (ctx?.type === 'external_tool' || ctx?.action === 'tool_invocation') return true;
      return false;
    }

    // ── destructive_action ────────────────────────────────────────────────────
    if (trigger === 'destructive_action') {
      const keywords = condition.keywords || [];
      if (keywords.length > 0) {
        return this.matchesKeywords(content, keywords, condition.match || 'any');
      }
      return this.containsDestructiveCommand(content);
    }

    // ── financial_action ──────────────────────────────────────────────────────
    if (trigger === 'financial_action') {
      const keywords = condition.keywords || [];
      if (keywords.length > 0) {
        return this.matchesKeywords(content, keywords, condition.match || 'any');
      }
      return this.containsFinancialAction(content);
    }

    // ── external_content_execution ────────────────────────────────────────────
    if (trigger === 'external_content_execution' || trigger === 'external_content') {
      const keywords = condition.keywords || [];
      if (keywords.length > 0) {
        return this.matchesKeywords(content, keywords, condition.match || 'any');
      }
      return this.containsExternalContentExecution(content);
    }

    // ── pattern (regex) ───────────────────────────────────────────────────────
    if (trigger === 'pattern' && condition.pattern) {
      try {
        const regex = new RegExp(condition.pattern, 'i');
        return regex.test(content);
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Evaluate a contains-type trigger (prompt_contains / output_contains).
   * Supports:
   *   - keywords: list of strings to match (any or all)
   *   - data_classification: PII, PHI, CLASSIFIED, CUI, PII_REQUEST
   *   - pattern: regex string
   */
  private evaluateContainsTrigger(
    condition: RaigoCondition,
    content: string,
    ctx: EvaluationRequest['context'],
    _direction: 'prompt' | 'output'
  ): boolean {
    // 1. Keyword matching
    if (condition.keywords && condition.keywords.length > 0) {
      if (this.matchesKeywords(content, condition.keywords, condition.match || 'any')) {
        return true;
      }
    }

    // 2. Data classification matching
    const classifications = condition.data_classification || [];
    for (const cls of classifications) {
      if (cls === 'PII' && (this.containsPII(content) || this.containsPIIRequest(content))) return true;
      if (cls === 'PHI' && this.containsPHI(content)) return true;
      if (cls === 'CLASSIFIED' && this.containsClassified(content)) return true;
      if (cls === 'CUI' && this.containsClassified(content)) return true;
      if (cls === 'PII_REQUEST' && this.containsPIIRequest(content)) return true;
      if (cls === 'PROMPT_INJECTION' && this.containsPromptInjection(content)) return true;
      if (cls === 'DESTRUCTIVE' && this.containsDestructiveCommand(content)) return true;
      if (cls === 'FINANCIAL' && this.containsFinancialAction(content)) return true;
      // Check context classifications too
      if (ctx?.data_classification?.includes(cls)) return true;
    }

    // 3. Environment match
    if (condition.environment && ctx?.environment) {
      if (condition.environment.includes(ctx.environment)) return true;
    }

    // 4. Pattern match
    if (condition.pattern) {
      try {
        const regex = new RegExp(condition.pattern, 'i');
        if (regex.test(content)) return true;
      } catch {
        // invalid regex — skip
      }
    }

    return false;
  }

  /**
   * Match content against a list of keywords.
   * mode='any': at least one keyword must appear (case-insensitive)
   * mode='all': all keywords must appear
   */
  private matchesKeywords(content: string, keywords: string[], mode: 'any' | 'all'): boolean {
    const lower = content.toLowerCase();
    if (mode === 'all') {
      return keywords.every(kw => lower.includes(kw.toLowerCase()));
    }
    return keywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  // ── Pattern detection helpers ───────────────────────────────────────────────

  private containsPII(text: string): boolean {
    return PII_PATTERNS.some(p => p.test(text));
  }

  private containsPIIRequest(text: string): boolean {
    return PII_REQUEST_PATTERNS.some(p => p.test(text));
  }

  private containsPHI(text: string): boolean {
    return PHI_PATTERNS.some(p => p.test(text)) || this.containsPII(text);
  }

  private containsClassified(text: string): boolean {
    return CLASSIFIED_PATTERNS.some(p => p.test(text));
  }

  private containsPromptInjection(text: string): boolean {
    return PROMPT_INJECTION_PATTERNS.some(p => p.test(text));
  }

  private containsDestructiveCommand(text: string): boolean {
    return DESTRUCTIVE_COMMAND_PATTERNS.some(p => p.test(text));
  }

  private containsFinancialAction(text: string): boolean {
    return FINANCIAL_ACTION_PATTERNS.some(p => p.test(text));
  }

  private containsExternalContentExecution(text: string): boolean {
    return EXTERNAL_CONTENT_EXECUTION_PATTERNS.some(p => p.test(text));
  }

  private buildViolationResponse(rule: RaigoPolicy): ViolationResponse {
    const errorCode = `RAIGO_${rule.action}_${rule.id.replace('-', '')}`;
    const httpStatus = rule.action === 'DENY' ? 403 : 200;

    return {
      rule_id: rule.id,
      rule_title: rule.title,
      error_code: errorCode,
      http_status: httpStatus,
      action: rule.action as 'DENY' | 'WARN',
      severity: rule.severity,
      user_message: rule.enforcement_message,
      developer_message: `Policy rule ${rule.id} (${rule.domain}) triggered. Action: ${rule.action}. Severity: ${rule.severity}. Directive: ${rule.directive}\n`,
      debug_hint: `Review the .raigo policy file and check the condition for rule ${rule.id}. Ensure the input does not contain data matching the trigger conditions.`,
      compliance_mapping: rule.compliance_mapping,
      audit_log: {
        timestamp: new Date().toISOString(),
        rule_id: rule.id,
        action: rule.action,
        severity: rule.severity,
        organisation: this.policy.metadata.organisation,
        policy_suite: this.policy.metadata.policy_suite,
        policy_version: this.policy.metadata.version,
      },
    };
  }
}
