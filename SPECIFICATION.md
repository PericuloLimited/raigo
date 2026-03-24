# RAIGO Specification — AI Policy Definition Language (AIPDL) v2.0

> The declarative standard for AI agent governance. Define your policies once. Compile to every AI tool.

**Maintained by:** [Periculo](https://periculo.co.uk) | **Format:** `.raigo` | **Schema Version:** 2.0  
**Website:** [raigo.ai](https://raigo.ai) | **Repository:** [github.com/PericuloLimited/raigo](https://github.com/PericuloLimited/raigo)

---

## Overview

A `.raigo` file is a YAML-based policy definition file. It is the single source of truth for an organisation's AI usage policies. The RAIGO compiler reads this file and produces tool-native outputs for every major AI platform — without requiring you to maintain separate policy configurations in each tool.

The design philosophy is borrowed from Rego/OPA: **declarative, not imperative**. You express *what* the rule is, not *how* to enforce it. The compiler handles the translation.

**Core design principle: every rule is atomic.** One rule ID. One directive. One action. This ensures each rule can be independently evaluated, logged, and enforced — with no ambiguity about which specific instruction was triggered.

---

## File Structure

A `.raigo` file has three top-level sections:

```yaml
raigo_version: "2.0"
metadata:    # Who owns this policy, when it was written, compliance context
context:     # The environment: tools, data classifications, networks, servers
policies:    # The rules: atomic, one directive per rule
```

---

## Section 1: Metadata

The `metadata` block describes the policy suite and provides context for auditors.

```yaml
metadata:
  organisation: "Acme Healthcare Trust"
  policy_suite: "ISO 27001 AI Governance Baseline"
  version: "1.3.0"
  effective_date: "2026-03-01"
  review_date: "2026-09-01"
  owner: "Information Security Team"
  contact: "security@acme-health.nhs.uk"
  classification: "OFFICIAL-SENSITIVE"
  jurisdiction: "UK"
  approved_by: "CISO"
  changelog:
    - version: "1.3.0"
      date: "2026-03-01"
      author: "J. Smith"
      summary: "Added CUI handling rules following DSPT audit"
```

| Field | Required | Description |
|---|---|---|
| `organisation` | Yes | Full legal name of the organisation |
| `policy_suite` | Yes | Name of this policy collection |
| `version` | Yes | Semantic version (MAJOR.MINOR.PATCH) |
| `effective_date` | Yes | ISO 8601 date when policy became active |
| `review_date` | Yes | ISO 8601 date when policy must be reviewed |
| `owner` | Yes | Team or role responsible for this policy |
| `contact` | Yes | Contact email for policy queries |
| `classification` | Yes | Data classification of this policy file |
| `jurisdiction` | Yes | Legal jurisdiction (e.g., `UK`, `EU`, `US`) |
| `approved_by` | Yes | Role or name of approving authority |
| `changelog` | Recommended | Version history for audit purposes |

---

## Section 2: Context

The `context` block defines the environment in which the policy operates. Inspired by OPA's data model — you declare the entities (tools, servers, networks, data types) and the rules reference them.

```yaml
context:
  environments:
    - id: "production"
      description: "Live clinical and operational systems"
      risk_level: "critical"
    - id: "staging"
      description: "Test environment"
      risk_level: "medium"

  data_classifications:
    - id: "PII"
      description: "Personally Identifiable Information"
      examples: ["name", "NHS number", "date of birth"]
    - id: "PHI"
      description: "Protected Health Information"
      examples: ["diagnosis", "medication", "clinical notes"]

  allowed_tools:
    - id: "microsoft_copilot"
      description: "Enterprise AI assistant"
      environments: ["production", "staging"]
    - id: "chatgpt"
      description: "NOT approved for patient data"
      environments: ["sandbox"]

  networks:
    - id: "internal_clinical"
      public: false
      description: "NHS internal clinical network"
    - id: "internet"
      public: true
      description: "Public internet"

  servers:
    - id: "clinical_db"
      protocols: ["tls_1_3"]
      networks: ["internal_clinical"]
      data_classifications: ["PHI", "PII"]
```

### Context Sub-fields

**`environments`**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier (referenced in rule conditions) |
| `description` | Yes | Human-readable description |
| `risk_level` | Yes | `critical` / `high` / `medium` / `low` |

**`data_classifications`**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier (e.g., `PII`, `PHI`, `CUI`) |
| `description` | Yes | Human-readable description |
| `examples` | Recommended | Example data items in this classification |

**`allowed_tools`**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Tool identifier (referenced in vendor rules) |
| `description` | Yes | Description and any restrictions |
| `environments` | Yes | List of environment IDs where this tool is approved |

**`networks`**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique network identifier |
| `public` | Yes | `true` if internet-facing, `false` if internal |
| `description` | Yes | Human-readable description |

**`servers`**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique server/system identifier |
| `protocols` | Yes | Allowed protocols (e.g., `tls_1_3`, `https`) |
| `networks` | Yes | Network IDs this server belongs to |
| `data_classifications` | Yes | Data classifications stored on this server |

---

## Section 3: Policies

Each rule is **atomic** — one rule ID, one directive, one action.

```yaml
policies:
  - id: "DP-01"
    domain: "Data Privacy"
    title: "Block PII transmission to external systems"
    condition:
      trigger: "output_contains"
      data_classification: ["PII", "PHI"]
      environment: ["production"]
    action: "DENY"
    severity: "critical"
    directive: "Never transmit personally identifiable information (PII) or protected health information (PHI) outside approved internal systems."
    enforcement_message: "BLOCKED [DP-01]: Transmission of PII/PHI to external systems is prohibited. This action violates ISO 27001 control A.8.2 and DSPT Standard 3."
    compliance_mapping:
      - framework: "ISO_27001"
        control: "A.8.2"
        description: "Information classification"
      - framework: "DSPT"
        control: "3.1"
        description: "Personal data is only accessible to authorised users"
    risk_level: "critical"
    audit_required: true
    human_review_required: false
    tags: ["data-privacy", "pii", "phi", "dspt"]
    platforms:
      - target: "n8n"
        override_message: "WORKFLOW HALTED: PII/PHI detected. Escalate to Information Governance."
```

### Rule Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | String | Unique rule identifier. Convention: `PREFIX-NN` (e.g., `DP-01`) |
| `domain` | Yes | String | Policy domain (e.g., `Data Privacy`, `Access Control`) |
| `title` | Yes | String | Short human-readable title |
| `condition` | Yes | Object or String | When this rule applies |
| `action` | Yes | Enum | `DENY` / `ENFORCE` / `WARN` |
| `severity` | Yes | Enum | `critical` / `high` / `medium` / `low` |
| `directive` | Yes | String | The single, atomic instruction. One sentence. |
| `enforcement_message` | Yes | String | Message shown to user/agent when rule fires |
| `compliance_mapping` | Recommended | Array | Links to regulatory controls |
| `audit_required` | Yes | Boolean | Whether this rule must generate an audit log entry |
| `human_review_required` | Yes | Boolean | Whether a human must approve before continuing |
| `review_message` | Conditional | String | Required if `human_review_required: true` |
| `escalation_contact` | Conditional | String | Required for `WARN` rules |
| `tags` | Recommended | Array | Searchable tags for filtering and reporting |
| `platforms` | Optional | Array | Platform-specific override messages |

---

### Actions

| Action | Meaning | Compiled Behaviour |
|---|---|---|
| `DENY` | Hard block. The agent must refuse this action entirely. | Refusal + enforcement message. Audit log if `audit_required: true`. Human escalation if `human_review_required: true`. |
| `ENFORCE` | Standing directive. The agent must always apply this rule. | Injected as a mandatory standing instruction in all compiled outputs. |
| `WARN` | Soft flag. The agent should pause and alert a human. | Triggers a warning message and escalation workflow. Does not hard-block. |

---

### Severity Levels

| Level | Meaning |
|---|---|
| `critical` | Breach would cause immediate regulatory, legal, or safety harm |
| `high` | Breach would cause significant operational or compliance risk |
| `medium` | Breach would cause moderate risk or policy non-compliance |
| `low` | Best practice guidance |

---

### Conditions

**Simple string:**
```yaml
condition: "always"
condition: "code_generation"
condition: "data_transfer"
```

**Structured object:**
```yaml
condition:
  trigger: "output_contains"
  data_classification: ["PII", "PHI"]
  environment: ["production"]
  destination: "outside_uk"
  source_server: "clinical_db"
  tool_not_in: ["n8n", "claude"]
  protocol_below: "tls_1_3"
  pattern: "hardcoded_credentials"
  language: ["python", "javascript"]
  anomaly_types: ["prompt_injection"]
```

**Trigger values:**

| Trigger | Use Case |
|---|---|
| `always` | Rule applies unconditionally |
| `output_contains` | Rule applies when output matches a pattern or data type |
| `data_transfer` | Rule applies when data is being transmitted |
| `data_access` | Rule applies when a data system is being accessed |
| `tool_invocation` | Rule applies when an external tool is called |
| `code_generation` | Rule applies during code generation tasks |
| `action_triggered` | Rule applies when another action fires |
| `anomaly_detected` | Rule applies when an anomaly is detected |

---

### Compliance Mapping

```yaml
compliance_mapping:
  - framework: "ISO_27001"
    control: "A.8.2"
    description: "Information classification"
```

**Supported framework identifiers:**

| Identifier | Framework |
|---|---|
| `ISO_27001` | ISO/IEC 27001:2022 |
| `NIST_800_53` | NIST SP 800-53 |
| `NIST_800_171` | NIST SP 800-171 |
| `CMMC` | Cybersecurity Maturity Model Certification |
| `HIPAA` | Health Insurance Portability and Accountability Act |
| `DSPT` | NHS Data Security and Protection Toolkit |
| `UK_GDPR` | UK General Data Protection Regulation |
| `EU_GDPR` | EU General Data Protection Regulation |
| `SOC2` | SOC 2 Type II |
| `OWASP` | OWASP Top 10 |
| `CIS` | CIS Controls |

---

## Rule ID Conventions

| Prefix | Domain |
|---|---|
| `DP-` | Data Privacy |
| `AC-` | Access Control |
| `CG-` | Secure Code Generation |
| `IR-` | Incident Response |
| `VR-` | Vendor & Third-Party Risk |
| `AL-` | Audit and Logging |
| `EN-` | Encryption |
| `BC-` | Business Continuity |
| `HR-` | Human Resources / Insider Threat |
| `EX-` | External Communication |

---

## Compiled Output Targets

| Target | Output File | Format | Used For |
|---|---|---|---|
| `n8n` | `n8n_policy.json` | JSON | Global Variable + AI Agent system prompt |
| `microsoft` | `microsoft_policy.json` | JSON | Declarative Agent Manifest + Azure RAI Policy |
| `claude` | `claude_system_prompt.xml` | XML | Claude API `system` parameter |
| `chatgpt` | `chatgpt_instructions.md` | Markdown | ChatGPT Custom Instructions / Assistants API |
| `openclaw` | `openclaw_policy.json` | JSON | OpenClaw gateway config + SOUL.md |
| `lovable` | `lovable_knowledge.md` | Markdown | Lovable Workspace Knowledge |
| `gemini` | `gemini_system_instruction.json` | JSON | Vertex AI `system_instruction` field |
| `perplexity` | `perplexity_instructions.md` | Markdown | Perplexity Spaces custom instructions |
| `summary` | `compliance_summary.md` | Markdown | Human-readable audit report |

---

## Usage

```bash
# Compile to all targets
python3 compile.py my-policy.raigo

# Compile to a specific target
python3 compile.py my-policy.raigo --target claude

# Specify output directory
python3 compile.py my-policy.raigo --output-dir ./compiled
```

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 2.0 | 2026-03-24 | Full schema redesign: structured conditions, compliance mapping, severity levels, human review flags, platform overrides, network/server topology model, 9 compiler targets |
| 1.1 | 2026-03-24 | Atomic single-directive rules (one directive per rule ID) |
| 1.0 | 2026-03-24 | Initial release |

---

*RAIGO is maintained by [Periculo](https://periculo.co.uk) — AI security specialists for defence and healthcare.*
