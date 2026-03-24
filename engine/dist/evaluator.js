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
// ─── PII / PHI Pattern Detection ─────────────────────────────────────────────
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
    /act\s+as\s+if\s+you\s+(have\s+no|don't\s+have)\s+(rules|restrictions|guidelines)/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /developer\s+mode\s+enabled/i,
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
            // Return the highest severity denial
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
        // Simple string conditions
        if (typeof condition === 'string') {
            if (condition === 'always')
                return true;
            if (condition === 'code_generation')
                return ctx?.language !== undefined;
            if (condition === 'data_transfer')
                return ctx?.destination !== undefined;
            return false;
        }
        // Structured conditions
        const trigger = condition.trigger || 'always';
        if (trigger === 'always')
            return true;
        if (trigger === 'output_contains' || trigger === 'input_contains') {
            const classifications = condition.data_classification || [];
            for (const cls of classifications) {
                if (cls === 'PII' && this.containsPII(content))
                    return true;
                if (cls === 'PHI' && this.containsPHI(content))
                    return true;
                if (cls === 'CLASSIFIED' && this.containsClassified(content))
                    return true;
                if (cls === 'CUI' && this.containsClassified(content))
                    return true;
                // Check context classifications too
                if (ctx?.data_classification?.includes(cls))
                    return true;
            }
            // Check environment match
            if (condition.environment && ctx?.environment) {
                if (condition.environment.includes(ctx.environment))
                    return true;
            }
            return false;
        }
        if (trigger === 'anomaly_detected') {
            const anomalyTypes = condition.anomaly_types || [];
            for (const anomaly of anomalyTypes) {
                if (anomaly === 'prompt_injection' && this.containsPromptInjection(content))
                    return true;
                if (ctx?.anomaly_types?.includes(anomaly))
                    return true;
            }
            return false;
        }
        if (trigger === 'data_transfer') {
            if (condition.destination && ctx?.destination) {
                if (condition.destination === 'outside_uk' && ctx.destination === 'outside_uk')
                    return true;
                if (condition.destination === 'external' && ctx.destination === 'external')
                    return true;
            }
            return false;
        }
        if (trigger === 'code_generation') {
            if (condition.language && ctx?.language) {
                return condition.language.includes(ctx.language);
            }
            return ctx?.language !== undefined;
        }
        if (trigger === 'tool_invocation') {
            if (condition.tool_not_in && ctx?.tool) {
                return !condition.tool_not_in.includes(ctx.tool);
            }
            return false;
        }
        return false;
    }
    containsPII(text) {
        return PII_PATTERNS.some(p => p.test(text));
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
            developer_message: `Policy rule ${rule.id} (${rule.domain}) triggered. Action: ${rule.action}. Severity: ${rule.severity}. Directive: ${rule.directive}`,
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
