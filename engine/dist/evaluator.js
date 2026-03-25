"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaigoEvaluator = void 0;
const yaml = __importStar(require("js-yaml"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Detection Pattern Libraries ─────────────────────────────────────────────
const PII_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Z]{2}\d{6}[A-Z]\b/, // UK NHS number style
    /\b\d{10}\b/, // NHS number
    /\bNHS\s*number\b/i,
    /\bdate\s+of\s+birth\b/i,
    /\bpassport\s+number\b/i,
    /\bNI\s*number\b/i,
    /\b[A-Z]{2}\s?\d{6}\s?[A-Z]\b/, // NI number
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
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
class RaigoEvaluator {
    constructor(policyPath) {
        this.policyPath = path.resolve(policyPath);
        this.policy = this.loadPolicy();
    }
    loadPolicy() {
        const raw = fs.readFileSync(this.policyPath, 'utf8');
        const parsed = yaml.load(raw);
        if (!parsed.policies || !Array.isArray(parsed.policies)) {
            throw new Error('Invalid .raigo file: missing policies array');
        }
        return parsed;
    }
    reload() {
        this.policy = this.loadPolicy();
    }
    getMetadata() {
        return this.policy.metadata;
    }
    getPolicies() {
        return this.policy.policies;
    }
    evaluate(request) {
        const start = Date.now();
        const content = [request.prompt, request.content].filter(Boolean).join(' ');
        const ctx = request.context || {};
        const triggered = [];
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
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
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
    ruleMatches(rule, content, ctx) {
        const condition = rule.condition;
        // ── Simple string conditions ──────────────────────────────────────────────
        if (typeof condition === 'string') {
            const c = condition.toLowerCase();
            if (c === 'always')
                return true;
            if (c === 'code_generation')
                return ctx?.language !== undefined;
            if (c === 'data_transfer')
                return ctx?.destination !== undefined;
            if (c === 'prompt_injection')
                return this.containsPromptInjection(content);
            if (c === 'pii_detected')
                return this.containsPII(content) || this.containsPIIRequest(content);
            if (c === 'phi_detected')
                return this.containsPHI(content);
            if (c === 'destructive_action')
                return this.containsDestructiveCommand(content);
            if (c === 'financial_action')
                return this.containsFinancialAction(content);
            if (c === 'external_content')
                return this.containsExternalContentExecution(content);
            return false;
        }
        // ── Structured conditions ─────────────────────────────────────────────────
        const trigger = (condition.trigger || 'always').toLowerCase();
        if (trigger === 'always')
            return true;
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
                if (anomaly === 'prompt_injection' && this.containsPromptInjection(content))
                    return true;
                if (anomaly === 'jailbreak' && this.containsPromptInjection(content))
                    return true;
                if (anomaly === 'instruction_override' && this.containsPromptInjection(content))
                    return true;
                if (anomaly === 'destructive_action' && this.containsDestructiveCommand(content))
                    return true;
                if (anomaly === 'financial_action' && this.containsFinancialAction(content))
                    return true;
                if (anomaly === 'code_injection' && this.containsExternalContentExecution(content))
                    return true;
                if (anomaly === 'pii_detected' && (this.containsPII(content) || this.containsPIIRequest(content)))
                    return true;
                if (anomaly === 'phi_detected' && this.containsPHI(content))
                    return true;
                if (ctx?.anomaly_types?.includes(anomaly))
                    return true;
            }
            return false;
        }
        // ── data_transfer ─────────────────────────────────────────────────────────
        if (trigger === 'data_transfer') {
            if (condition.destination && ctx?.destination) {
                if (condition.destination === 'outside_uk' && ctx.destination === 'outside_uk')
                    return true;
                if (condition.destination === 'external' && ctx.destination === 'external')
                    return true;
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
        // Fires when an EXTERNAL tool is explicitly invoked.
        // context.tool = the calling platform (e.g. 'openclaw') — NOT the external tool.
        // context.tool_invocation = the external tool being invoked (e.g. 'external_api').
        // This rule only fires when context.tool_invocation is explicitly set.
        if (trigger === 'tool_invocation') {
            const externalTool = ctx?.tool_invocation;
            if (!externalTool) {
                // No external tool invocation signalled — do not fire
                return false;
            }
            if (condition.tool_not_in && condition.tool_not_in.length > 0) {
                // Fire only if the external tool is not in the approved list
                return !condition.tool_not_in.includes(externalTool);
            }
            // No approved list — fire on any explicit external tool invocation
            return true;
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
            }
            catch {
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
    evaluateContainsTrigger(condition, content, ctx, _direction) {
        // 1. Keyword matching
        if (condition.keywords && condition.keywords.length > 0) {
            if (this.matchesKeywords(content, condition.keywords, condition.match || 'any')) {
                return true;
            }
        }
        // 2. Data classification matching
        const classifications = condition.data_classification || [];
        for (const cls of classifications) {
            if (cls === 'PII' && (this.containsPII(content) || this.containsPIIRequest(content)))
                return true;
            if (cls === 'PHI' && this.containsPHI(content))
                return true;
            if (cls === 'CLASSIFIED' && this.containsClassified(content))
                return true;
            if (cls === 'CUI' && this.containsClassified(content))
                return true;
            if (cls === 'PII_REQUEST' && this.containsPIIRequest(content))
                return true;
            if (cls === 'PROMPT_INJECTION' && this.containsPromptInjection(content))
                return true;
            if (cls === 'DESTRUCTIVE' && this.containsDestructiveCommand(content))
                return true;
            if (cls === 'FINANCIAL' && this.containsFinancialAction(content))
                return true;
            // Check context classifications too
            if (ctx?.data_classification?.includes(cls))
                return true;
        }
        // 3. Environment match
        if (condition.environment && ctx?.environment) {
            if (condition.environment.includes(ctx.environment))
                return true;
        }
        // 4. Pattern match
        if (condition.pattern) {
            try {
                const regex = new RegExp(condition.pattern, 'i');
                if (regex.test(content))
                    return true;
            }
            catch {
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
    matchesKeywords(content, keywords, mode) {
        const lower = content.toLowerCase();
        if (mode === 'all') {
            return keywords.every(kw => lower.includes(kw.toLowerCase()));
        }
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    }
    // ── Pattern detection helpers ───────────────────────────────────────────────
    containsPII(text) {
        return PII_PATTERNS.some(p => p.test(text));
    }
    containsPIIRequest(text) {
        return PII_REQUEST_PATTERNS.some(p => p.test(text));
    }
    containsPHI(text) {
        return PHI_PATTERNS.some(p => p.test(text)) || this.containsPII(text);
    }
    containsClassified(text) {
        return CLASSIFIED_PATTERNS.some(p => p.test(text));
    }
    containsPromptInjection(text) {
        return PROMPT_INJECTION_PATTERNS.some(p => p.test(text));
    }
    containsDestructiveCommand(text) {
        return DESTRUCTIVE_COMMAND_PATTERNS.some(p => p.test(text));
    }
    containsFinancialAction(text) {
        return FINANCIAL_ACTION_PATTERNS.some(p => p.test(text));
    }
    containsExternalContentExecution(text) {
        return EXTERNAL_CONTENT_EXECUTION_PATTERNS.some(p => p.test(text));
    }
    buildViolationResponse(rule) {
        const errorCode = `RAIGO_${rule.action}_${rule.id.replace('-', '')}`;
        const httpStatus = rule.action === 'DENY' ? 403 : 200;
        return {
            rule_id: rule.id,
            rule_title: rule.title,
            error_code: errorCode,
            http_status: httpStatus,
            action: rule.action,
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
exports.RaigoEvaluator = RaigoEvaluator;
