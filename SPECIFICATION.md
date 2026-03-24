# RAIGO Format Specification v1.0

**Maintainer:** Periculo Security  
**Version:** 1.0.0  
**Status:** Draft — Open for Community Review

---

## Overview

A `.raigo` file is a YAML document that defines an organisation's AI agent governance policies in a declarative, machine-readable format. It is the single source of truth for how AI agents should behave within a given organisation or team.

---

## Top-Level Structure

```yaml
version:        # string, required — schema version (e.g., "1.0")
organization:   # string, required — name of the organisation
department:     # string, optional — specific team or department scope
last_updated:   # string, optional — ISO 8601 timestamp

context:        # object, required — operational environment definition
policies:       # array, required — list of policy rules
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

Each item in the `policies` array is a rule object:

```yaml
- id:                   # string, required — unique rule ID (e.g., "SEC-001")
  domain:               # string, required — category (e.g., "Data Privacy", "Code Generation")
  condition:            # string, required — trigger scenario (e.g., "Always", "If handling PII")
  action:               # string, required — "ENFORCE" | "DENY" | "WARN"
  directives:           # array of strings, required — specific instructions for the agent
  enforcement_message:  # string, optional — message returned to user when rule triggers
```

### Action Types

| Action | Behaviour |
|---|---|
| `ENFORCE` | The agent must always follow these directives. |
| `DENY` | The agent must refuse to perform the action and return the enforcement_message. |
| `WARN` | The agent may proceed but must surface a warning to the user. |

---

## Full Example

```yaml
version: "1.0"
organization: "Periculo Security"
department: "Engineering"
last_updated: "2026-03-24T10:00:00Z"

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
    directives:
      - "Never process real patient data or user emails."
      - "Do not send PII to external APIs outside the allowed_tools list."
    enforcement_message: "Action blocked by policy DP-01: PII/PHI detected."

  - id: "SEC-01"
    domain: "Code Generation"
    condition: "Always"
    action: "ENFORCE"
    directives:
      - "Never hardcode API keys, passwords, or secrets."
      - "Always sanitise SQL inputs."
      - "Use environment variables for all configuration secrets."

  - id: "COM-01"
    domain: "Communication"
    condition: "When drafting external messages"
    action: "ENFORCE"
    directives:
      - "Maintain a professional, formal tone."
      - "Do not make legal or compliance commitments on behalf of the organisation."
```
