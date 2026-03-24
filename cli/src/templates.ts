/**
 * RAIGO init templates
 * Starter .raigo policy files for different organisation types.
 */

export function INIT_TEMPLATE(type: string, orgName: string): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const base = `raigo_version: "2.0"

metadata:
  version: "1.0"
  organisation: "${orgName}"
  policy_suite: "${getSuiteName(type)}"
  classification: "INTERNAL"
  jurisdiction: "UK"
  owner: "CISO"
  effective_date: "${today}"
  review_date: "${reviewDate}"

context:
  environments:
    - id: "production"
      description: "Live production environment"
    - id: "staging"
      description: "Staging and testing environment"
    - id: "development"
      description: "Local development environment"

  data_classifications:
    - id: "PUBLIC"
      description: "Publicly available information"
    - id: "INTERNAL"
      description: "Internal business information"
    - id: "CONFIDENTIAL"
      description: "Sensitive business information"

  allowed_tools:
    - id: "web_search"
      description: "Search the public internet"
    - id: "code_execution"
      description: "Execute code in a sandboxed environment"

policies:
${getPolicies(type)}`;

  return base;
}

function getSuiteName(type: string): string {
  const names: Record<string, string> = {
    general: 'General AI Governance Policy',
    healthcare: 'Healthcare AI Governance Policy (HIPAA/DSPT)',
    defence: 'Defence AI Governance Policy (CMMC/JSP 604)',
    startup: 'Startup AI Governance Policy'
  };
  return names[type] || names.general;
}

function getPolicies(type: string): string {
  if (type === 'healthcare') return healthcarePolicies();
  if (type === 'defence') return defencePolicies();
  if (type === 'startup') return startupPolicies();
  return generalPolicies();
}

function generalPolicies(): string {
  return `  - id: "DP-01"
    domain: "Data Privacy"
    title: "Block PII transmission"
    action: DENY
    severity: critical
    directive: "Never transmit personally identifiable information to external systems without explicit authorisation."
    enforcement_message: "This action was blocked: transmitting PII to external systems is not permitted."
    audit_required: true
    compliance_mapping:
      - framework: "UK GDPR"
        control: "Article 5(1)(f)"
    violation_response:
      error_code: "RAIGO_DENY_DP01"
      http_status: 403
      user_message: "This action was blocked by your organisation's AI policy."
      developer_message: "Policy violation: Rule DP-01 — PII transmission blocked."
      debug_hint: "Check the output payload for PII fields. Anonymise before sending."
      next_steps:
        - "Review the data payload and remove any PII."
        - "If transfer is required, obtain explicit authorisation."

  - id: "SC-01"
    domain: "Secure Code"
    title: "No hardcoded credentials"
    action: DENY
    severity: critical
    directive: "Never generate code that contains hardcoded passwords, API keys, or credentials."
    enforcement_message: "Hardcoded credentials are not permitted. Use environment variables or a secrets manager."
    audit_required: true
    compliance_mapping:
      - framework: "ISO 27001"
        control: "A.9.4.3"
    violation_response:
      error_code: "RAIGO_DENY_SC01"
      http_status: 403
      user_message: "Hardcoded credentials are not permitted."
      developer_message: "Policy violation: Rule SC-01 — Hardcoded credentials detected."
      debug_hint: "Replace hardcoded values with environment variable references."
      next_steps:
        - "Use environment variables (process.env.MY_KEY)."
        - "Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)."

  - id: "AC-01"
    domain: "Access Control"
    title: "Principle of least privilege"
    action: ENFORCE
    severity: high
    directive: "Always apply the principle of least privilege when requesting or granting access to systems or data."
    enforcement_message: "Access must be limited to the minimum required for the task."
    compliance_mapping:
      - framework: "ISO 27001"
        control: "A.9.1.2"

  - id: "IR-01"
    domain: "Incident Response"
    title: "Flag potential security incidents"
    action: WARN
    severity: high
    directive: "Flag any action that may constitute a security incident for human review before proceeding."
    enforcement_message: "This action may be a security incident. Please review before proceeding."
    human_review_required: true
    escalation_contact: "security@your-organisation.com"
    review_message: "A potential security incident has been flagged. Please review and approve before the agent continues."`;
}

function healthcarePolicies(): string {
  return `  - id: "DP-01"
    domain: "Data Privacy"
    title: "Block PHI/PII transmission"
    action: DENY
    severity: critical
    directive: "Never transmit Protected Health Information (PHI) or PII to external systems or APIs."
    enforcement_message: "This action was blocked: PHI/PII transmission to external systems is not permitted under HIPAA."
    audit_required: true
    compliance_mapping:
      - framework: "HIPAA"
        control: "164.514"
      - framework: "DSPT"
        control: "3.1"
      - framework: "UK GDPR"
        control: "Article 5(1)(f)"
    violation_response:
      error_code: "RAIGO_DENY_DP01"
      http_status: 403
      user_message: "This action was blocked: patient data cannot be transmitted to external systems."
      developer_message: "Policy violation: Rule DP-01 — PHI/PII transmission blocked. HIPAA 164.514."
      debug_hint: "Anonymise or pseudonymise patient data before any external transmission."
      next_steps:
        - "Anonymise all PHI fields before processing."
        - "If transfer is required, complete a DPIA and obtain DPO approval."

  - id: "AC-01"
    domain: "Access Control"
    title: "Role-based access enforcement"
    action: ENFORCE
    severity: critical
    directive: "Always verify role-based access controls before accessing or returning patient records."
    enforcement_message: "Access to patient records requires verified role-based authorisation."
    audit_required: true
    compliance_mapping:
      - framework: "HIPAA"
        control: "164.312(a)(1)"
      - framework: "DSPT"
        control: "7.1"

  - id: "IR-01"
    domain: "Incident Response"
    title: "Flag potential data breach"
    action: WARN
    severity: critical
    directive: "Flag any action that may constitute a data breach or unauthorised access to patient data."
    enforcement_message: "Potential data breach detected. This requires immediate human review."
    human_review_required: true
    escalation_contact: "dpo@your-organisation.nhs.uk"
    review_message: "A potential data breach has been flagged. The DPO must review before the agent continues."
    compliance_mapping:
      - framework: "UK GDPR"
        control: "Article 33"
      - framework: "DSPT"
        control: "9.1"`;
}

function defencePolicies(): string {
  return `  - id: "CUI-01"
    domain: "Controlled Unclassified Information"
    title: "Block CUI external transmission"
    action: DENY
    severity: critical
    directive: "Never transmit Controlled Unclassified Information (CUI) to systems not approved for CUI handling."
    enforcement_message: "This action was blocked: CUI cannot be transmitted to non-approved systems."
    audit_required: true
    compliance_mapping:
      - framework: "CMMC"
        control: "AC.1.001"
      - framework: "JSP 604"
        control: "3.2.1"
    violation_response:
      error_code: "RAIGO_DENY_CUI01"
      http_status: 403
      user_message: "CUI transmission blocked. This system is not approved for CUI handling."
      developer_message: "Policy violation: Rule CUI-01 — CUI transmission to non-approved system. CMMC AC.1.001."
      debug_hint: "Verify the target system is on the approved CUI systems list before retrying."
      next_steps:
        - "Check the approved CUI systems list."
        - "Obtain system owner approval before transmitting CUI."

  - id: "AC-01"
    domain: "Access Control"
    title: "Least privilege for classified systems"
    action: ENFORCE
    severity: critical
    directive: "Always apply least-privilege access when interacting with classified or CUI systems."
    enforcement_message: "Access must be limited to the minimum required under the need-to-know principle."
    audit_required: true
    compliance_mapping:
      - framework: "CMMC"
        control: "AC.1.002"
      - framework: "NIST SP 800-171"
        control: "3.1.2"

  - id: "IR-01"
    domain: "Incident Response"
    title: "Flag potential security incident"
    action: WARN
    severity: critical
    directive: "Flag any action that may constitute a security incident or unauthorised access attempt."
    enforcement_message: "Potential security incident. This requires immediate human review."
    human_review_required: true
    escalation_contact: "security-ops@your-organisation.mod.uk"
    review_message: "A potential security incident has been flagged. Security Ops must review before the agent continues."`;
}

function startupPolicies(): string {
  return `  - id: "DP-01"
    domain: "Data Privacy"
    title: "No customer PII to external APIs"
    action: DENY
    severity: high
    directive: "Never send customer PII to external APIs or third-party services without explicit consent."
    enforcement_message: "Customer PII cannot be sent to external services."
    audit_required: true
    compliance_mapping:
      - framework: "UK GDPR"
        control: "Article 5(1)(f)"
    violation_response:
      error_code: "RAIGO_DENY_DP01"
      http_status: 403
      user_message: "Customer data cannot be sent to external services."
      developer_message: "Policy violation: Rule DP-01 — PII transmission blocked."
      debug_hint: "Anonymise customer data before passing to external APIs."
      next_steps:
        - "Remove or hash PII fields before the API call."

  - id: "SC-01"
    domain: "Secure Code"
    title: "No hardcoded secrets"
    action: DENY
    severity: critical
    directive: "Never generate code containing hardcoded API keys, passwords, or secrets."
    enforcement_message: "Use environment variables or a secrets manager instead."
    compliance_mapping:
      - framework: "OWASP"
        control: "A02:2021"
    violation_response:
      error_code: "RAIGO_DENY_SC01"
      http_status: 403
      user_message: "Hardcoded secrets are not permitted."
      developer_message: "Policy violation: Rule SC-01 — Hardcoded credential detected."
      debug_hint: "Replace with process.env.MY_SECRET or equivalent."
      next_steps:
        - "Use environment variables."
        - "Use a secrets manager."

  - id: "AC-01"
    domain: "Access Control"
    title: "Least privilege"
    action: ENFORCE
    severity: medium
    directive: "Always request only the minimum permissions required for the task."
    enforcement_message: "Request only the permissions you need."

  - id: "EX-01"
    domain: "External Communication"
    title: "Flag external data sharing"
    action: WARN
    severity: medium
    directive: "Flag any action that shares business data with external parties for human review."
    enforcement_message: "Sharing business data externally requires approval."
    human_review_required: true
    escalation_contact: "cto@your-startup.com"`;
}
