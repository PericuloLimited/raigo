# RAIGO Format Specification v1.1

**Maintainer:** Periculo Security  
**Version:** 1.1.0  
**Status:** Draft — Open for Community Review  
**Website:** [raigo.periculo.co.uk](https://raigo.periculo.co.uk)

---

## Overview

A `.raigo` file is a YAML document that defines an organisation's AI agent governance policies in a declarative, machine-readable format. It is the single source of truth for how AI agents should behave within a given organisation or team.

**Core design principle: every rule is atomic.** One rule ID. One condition. One action. One directive. This ensures each rule can be independently evaluated, logged, and enforced — with no ambiguity about which specific instruction was triggered.

---

## Top-Level Structure

```yaml
version:        # string, required — schema version (e.g., "1.1")
organization:   # string, required — name of the organisation
department:     # string, optional — specific team or department scope
last_updated:   # string, optional — ISO 8601 timestamp
framework:      # string, optional — compliance framework (e.g., "ISO/IEC 27001:2022", "HIPAA", "CMMC")

context:        # object, required — operational environment definition
policies:       # array, required — list of atomic policy rules
```

---

## The `context` Object

```yaml
context:
  environment:          # string — "production" | "staging" | "internal-only" | "sandbox"
  data_classification:  # string — "public" | "internal" | "confidential" | "restricted"
  allowed_tools:        # array of strings — explicit allowlist of permitted tool/API names
```

---

## The `policies` Array

Each item in the `policies` array is a single atomic rule. **One rule = one directive.**

```yaml
- id:                   # string, required — unique rule ID (e.g., "SEC-01")
  domain:               # string, required — category (e.g., "Data Privacy", "Code Generation")
  condition:            # string, required — trigger scenario (e.g., "Always", "If handling PII")
  action:               # string, required — "ENFORCE" | "DENY" | "WARN"
  directive:            # string, required — the single, specific instruction for this rule
  enforcement_message:  # string, optional — message returned to user/agent when rule triggers
```

### Why Atomic Rules?

Each rule has exactly one `directive` (not an array). This means:

- An agent evaluates one condition against one instruction — no ambiguity
- Audit logs reference a specific rule ID to a specific instruction
- Rules can be individually enabled, disabled, or overridden without side effects
- The format is simpler to parse, validate, and reason about

### Action Types

| Action | Behaviour |
|---|---|
| `ENFORCE` | The agent must always follow this directive. It is a standing instruction. |
| `DENY` | The agent must refuse to perform the action and return the `enforcement_message`. |
| `WARN` | The agent may proceed but must surface the `enforcement_message` as a visible warning to the user. |

---

## Rule ID Convention

Rule IDs use a two-part format: a domain prefix and a sequential number.

| Prefix | Domain |
|---|---|
| `DP-` | Data Privacy |
| `AC-` | Access Control |
| `SEC-` | Secure Code Generation |
| `IR-` | Incident Response |
| `VR-` | Vendor & Third-Party Risk |
| `ENC-` | Encryption |
| `COM-` | External Communication |
| `AUD-` | Audit & Logging |
| `BC-` | Business Continuity |

You may define your own prefixes for organisation-specific domains.

---

## Full Example

```yaml
version: "1.1"
organization: "Periculo Security"
department: "Engineering"
last_updated: "2026-03-24T10:00:00Z"
framework: "ISO/IEC 27001:2022"

context:
  environment: "internal-only"
  data_classification: "confidential"
  allowed_tools:
    - "github_api"
    - "internal_jira"
    - "local_filesystem"

policies:

  - id: "DP-01"
    domain: "Data Privacy"
    condition: "If input or output contains PII or PHI"
    action: "DENY"
    directive: "Never transmit or process real patient data or user PII outside of approved internal systems."
    enforcement_message: "Blocked by DP-01: PII/PHI detected. This action is restricted to approved internal systems only."

  - id: "DP-02"
    domain: "Data Privacy"
    condition: "If sending data to an external service"
    action: "DENY"
    directive: "Do not send PII to external APIs outside the allowed_tools list."
    enforcement_message: "Blocked by DP-02: External data transmission of PII is not permitted."

  - id: "SEC-01"
    domain: "Secure Code Generation"
    condition: "Always"
    action: "DENY"
    directive: "Never hardcode API keys, passwords, or secrets in generated code."
    enforcement_message: "Blocked by SEC-01: Hardcoded secrets detected. Use environment variables instead."

  - id: "SEC-02"
    domain: "Secure Code Generation"
    condition: "When generating database query code"
    action: "ENFORCE"
    directive: "Apply parameterised queries or prepared statements to prevent SQL injection."

  - id: "COM-01"
    domain: "External Communication"
    condition: "When drafting external messages"
    action: "ENFORCE"
    directive: "Maintain a professional, formal tone and do not make legal commitments on behalf of the organisation."
```

---

## Compilation Targets

A single `.raigo` file compiles into:

| Target | Output Format | Use Case |
|---|---|---|
| **Lovable** | Markdown knowledge block | Paste into Lovable Workspace Knowledge |
| **n8n** | JSON node configuration | Import into n8n AI Agent node |
| **OpenClaw** | Structured JSON constraint file | Load at OpenClaw agent initialisation |
| **ChatGPT** | Plain text custom instructions | Paste into ChatGPT Custom Instructions |

Use the RAIGO compiler at [raigo.periculo.co.uk](https://raigo.periculo.co.uk) or via the CLI:

```bash
raigo compile policy.raigo --target lovable
raigo compile policy.raigo --all
```

---

## Changelog

| Version | Change |
|---|---|
| 1.1.0 | Atomic rule schema: `directives` array replaced by single `directive` string |
| 1.0.0 | Initial release |
