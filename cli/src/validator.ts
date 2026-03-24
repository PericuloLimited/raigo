/**
 * RAIGO v2.0 Schema Validator
 * Validates a parsed .raigo policy object against the RAIGO v2.0 schema.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ACTIONS = ['DENY', 'ENFORCE', 'WARN'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const VALID_CLASSIFICATIONS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET', 'OFFICIAL', 'OFFICIAL-SENSITIVE', 'RESTRICTED', 'TOP-SECRET'];

export function validatePolicy(policy: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Top-level required fields ─────────────────────────────────────────────
  if (!policy.raigo_version) {
    errors.push('Missing required field: raigo_version');
  }

  // ── Metadata ──────────────────────────────────────────────────────────────
  if (!policy.metadata) {
    errors.push('Missing required section: metadata');
  } else {
    const meta = policy.metadata;
    const requiredMeta = ['version', 'organisation', 'policy_suite', 'classification', 'owner'];
    requiredMeta.forEach(field => {
      if (!meta[field]) errors.push(`Missing required metadata field: ${field}`);
    });
    if (meta.classification && !VALID_CLASSIFICATIONS.includes(meta.classification)) {
      errors.push(`Invalid classification "${meta.classification}". Must be one of: ${VALID_CLASSIFICATIONS.join(', ')}`);
    }
  }

  // ── Context ───────────────────────────────────────────────────────────────
  if (!policy.context) {
    warnings.push('Missing recommended section: context (environments, data_classifications, allowed_tools)');
  } else {
    const ctx = policy.context;
    if (!Array.isArray(ctx.environments)) warnings.push('context.environments should be an array');
    if (!Array.isArray(ctx.data_classifications)) warnings.push('context.data_classifications should be an array');
    if (!Array.isArray(ctx.allowed_tools)) warnings.push('context.allowed_tools should be an array');
  }

  // ── Policies ──────────────────────────────────────────────────────────────
  if (!policy.policies) {
    errors.push('Missing required section: policies');
  } else if (!Array.isArray(policy.policies)) {
    errors.push('policies must be an array');
  } else if (policy.policies.length === 0) {
    warnings.push('policies array is empty — no rules defined');
  } else {
    const seenIds = new Set<string>();

    policy.policies.forEach((rule: any, idx: number) => {
      const prefix = `policies[${idx}]`;

      // Required fields
      if (!rule.id) {
        errors.push(`${prefix}: Missing required field: id`);
      } else {
        if (seenIds.has(rule.id)) {
          errors.push(`${prefix}: Duplicate rule id "${rule.id}"`);
        }
        seenIds.add(rule.id);
      }

      if (!rule.domain) errors.push(`${prefix} (${rule.id || idx}): Missing required field: domain`);
      if (!rule.title) errors.push(`${prefix} (${rule.id || idx}): Missing required field: title`);
      if (!rule.directive) errors.push(`${prefix} (${rule.id || idx}): Missing required field: directive`);
      if (!rule.enforcement_message) warnings.push(`${prefix} (${rule.id || idx}): Missing recommended field: enforcement_message`);

      // Action validation
      if (!rule.action) {
        errors.push(`${prefix} (${rule.id || idx}): Missing required field: action`);
      } else if (!VALID_ACTIONS.includes(rule.action)) {
        errors.push(`${prefix} (${rule.id || idx}): Invalid action "${rule.action}". Must be one of: ${VALID_ACTIONS.join(', ')}`);
      }

      // Severity validation
      if (!rule.severity) {
        warnings.push(`${prefix} (${rule.id || idx}): Missing recommended field: severity`);
      } else if (!VALID_SEVERITIES.includes(rule.severity)) {
        errors.push(`${prefix} (${rule.id || idx}): Invalid severity "${rule.severity}". Must be one of: ${VALID_SEVERITIES.join(', ')}`);
      }

      // DENY rules should have violation_response
      if (rule.action === 'DENY' && !rule.violation_response) {
        warnings.push(`${prefix} (${rule.id || idx}): DENY rule missing recommended field: violation_response`);
      }

      // WARN rules should have escalation_contact
      if (rule.action === 'WARN' && !rule.escalation_contact) {
        warnings.push(`${prefix} (${rule.id || idx}): WARN rule missing recommended field: escalation_contact`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
