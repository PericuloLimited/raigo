# raigo Multi-Rule Conflict Resolution

**Specification version: 0.2.0**

This document defines exactly what happens when a prompt matches more than one rule in a `.raigo` policy file. The behaviour is deterministic, predictable, and auditable — there are no surprises.

---

## The Problem

A real-world policy file typically contains dozens of rules. A single prompt may match multiple rules simultaneously. For example, a prompt such as:

```
"Send the patient's date of birth and NHS number to dr.jones@hospital.nhs.uk"
```

could match all three of the following rules in an NHS policy:

| Rule ID | Trigger | Action | Severity |
|---|---|---|---|
| `NHS-PHI-001` | `prompt_contains: "NHS number"` | `block` | `critical` |
| `NHS-PHI-002` | `prompt_contains: "date of birth"` | `warn` | `high` |
| `NHS-SEC-001` | `tool_invocation: "send_email"` | `block` | `critical` |

Without a defined resolution strategy, the engine's behaviour would be ambiguous. raigo resolves this with a single, fixed algorithm: **most-restrictive wins**.

---

## Resolution Algorithm: Most-Restrictive Wins

raigo always applies the **most restrictive** action from all matched rules. The action precedence order is:

```
block  >  warn  >  allow
```

Within the same action level, the rule with the **highest severity** is selected as the representative matched rule for the response. The severity precedence order is:

```
critical  >  high  >  medium  >  low
```

This means:

- If **any** matched rule has `action: block`, the final action is always `block`, regardless of how many `warn` or `allow` rules also matched.
- If no `block` rules matched but **any** matched rule has `action: warn`, the final action is `warn`.
- The final action is `allow` only if every matched rule has `action: allow`, or if no rules matched at all.

### Decision Table

| Matched actions | Final action |
|---|---|
| `block` only | `block` |
| `warn` only | `warn` |
| `allow` only | `allow` |
| `block` + `warn` | `block` |
| `block` + `allow` | `block` |
| `warn` + `allow` | `warn` |
| `block` + `warn` + `allow` | `block` |
| No rules matched | `allow` |

---

## Representative Rule Selection

When multiple rules share the winning action, raigo selects the **representative rule** — the one whose details appear in the API response — using the following tiebreaker sequence:

1. **Highest severity** (`critical` > `high` > `medium` > `low`)
2. **Lowest rule index** (the rule that appears first in the `rules` array of the policy file)

The representative rule's `id`, `name`, `message`, `error_code`, and `compliance_refs` are returned in the API response. All other matched rules are listed in the `conflict_resolution.all_matched_rules` field.

---

## API Response When Conflicts Occur

When multiple rules matched, the response includes a `conflict_resolution` object:

```json
{
  "action": "block",
  "evaluation_id": "eval_aB3kL9mNpQrStUvWxYz",
  "policy_id": "nhs-patient-data-v1",
  "policy_version": "1.0",
  "matched_rule": {
    "id": "NHS-PHI-001",
    "name": "Block Patient Record Access",
    "action": "block",
    "severity": "critical"
  },
  "message": "Access to patient records via AI is prohibited under NHS data governance policy.",
  "error_code": "NHS_PHI_001_VIOLATION",
  "compliance_refs": ["HIPAA-164.514", "GDPR-Art.9", "CQC-Reg.17"],
  "conflict_resolution": {
    "strategy": "most_restrictive",
    "all_matched_rules": [
      { "id": "NHS-PHI-001", "action": "block", "severity": "critical" },
      { "id": "NHS-PHI-002", "action": "warn",  "severity": "high" },
      { "id": "NHS-SEC-001", "action": "block", "severity": "critical" }
    ]
  },
  "latency_ms": 4,
  "evaluated_at": "2026-03-26T14:00:00.123Z"
}
```

When only one rule matched, `conflict_resolution` is `null`.

---

## Rule Priority Override (Optional)

For cases where the default most-restrictive strategy is insufficient, raigo supports an optional `priority` field on individual rules. Rules with a higher `priority` value take precedence over lower-priority rules **within the same action level**.

```yaml
rules:
  - id: "ORG-EXC-001"
    name: "Executive Override — Allow Strategic Planning Queries"
    description: "Explicitly allows strategic planning queries for C-suite users"
    enabled: true
    action: allow
    severity: low
    priority: 100          # Higher number = higher priority
    triggers:
      prompt_contains:
        - "strategic plan"
        - "board presentation"
    message: "Strategic planning queries are permitted for authorised users."
    error_code: "ORG_EXC_001_ALLOW"
    compliance:
      - "ISO42001-5.2"
```

Priority rules:

- `priority` is an optional integer. Default is `0`.
- Priority only affects tiebreaking **within the same action level**. A `block` rule with `priority: 0` still beats a `warn` rule with `priority: 999`.
- Priority does **not** override the most-restrictive action hierarchy. It only determines which rule is selected as the representative when two rules have the same action and severity.
- Use priority sparingly. Overuse creates policies that are difficult to reason about.

---

## `allow` Rules and Explicit Permits

An `allow` rule can be used to create an explicit permit list. However, because `block` always beats `allow`, an explicit `allow` rule will never override a `block` rule for the same prompt.

If you need to create an exception to a `block` rule, you must either:

1. **Disable the block rule** for the specific context using the `enabled` field and a separate policy variant.
2. **Narrow the block rule's triggers** so it does not match the excepted prompt.
3. **Use policy scoping** (planned for v0.3) to apply different policies to different user roles or contexts.

This design is intentional. A governance engine that allows `allow` rules to silently override `block` rules would undermine the purpose of the policy.

---

## Worked Examples

### Example 1: Block beats Warn

**Policy:**

```yaml
rules:
  - id: "FIN-PII-001"
    action: warn
    severity: high
    triggers:
      prompt_contains: ["account number"]

  - id: "FIN-PII-002"
    action: block
    severity: critical
    triggers:
      prompt_contains: ["sort code"]
```

**Prompt:** `"The account number is 12345678 and the sort code is 20-00-00"`

**Matched rules:** `FIN-PII-001` (warn), `FIN-PII-002` (block)

**Result:** `action: block`, representative rule: `FIN-PII-002`

---

### Example 2: Two blocks — highest severity wins

**Policy:**

```yaml
rules:
  - id: "FIN-PII-003"
    action: block
    severity: high
    triggers:
      prompt_contains: ["credit card"]

  - id: "FIN-PII-004"
    action: block
    severity: critical
    triggers:
      prompt_contains: ["CVV"]
```

**Prompt:** `"My credit card CVV is 123"`

**Matched rules:** `FIN-PII-003` (block, high), `FIN-PII-004` (block, critical)

**Result:** `action: block`, representative rule: `FIN-PII-004` (critical wins over high)

---

### Example 3: Two blocks — same severity, first in file wins

**Policy:**

```yaml
rules:
  - id: "FIN-PII-005"      # index 0
    action: block
    severity: critical
    triggers:
      prompt_contains: ["IBAN"]

  - id: "FIN-PII-006"      # index 1
    action: block
    severity: critical
    triggers:
      prompt_contains: ["BIC"]
```

**Prompt:** `"Transfer to IBAN DE89370400440532013000, BIC COBADEFFXXX"`

**Matched rules:** `FIN-PII-005` (block, critical), `FIN-PII-006` (block, critical)

**Result:** `action: block`, representative rule: `FIN-PII-005` (lower index wins)

---

### Example 4: No rules match

**Prompt:** `"What is the current base rate set by the Bank of England?"`

**Matched rules:** none

**Result:** `action: allow`, `matched_rule: null`, `conflict_resolution: null`

---

## Implications for Policy Authors

Understanding the resolution algorithm has direct implications for how you write policies:

**Block rules are absolute.** Once a `block` rule is in your policy and its trigger matches, the request will be blocked. There is no way to override it with an `allow` rule in the same policy. Design your triggers carefully.

**Warn rules are advisory.** A `warn` result means the request was allowed through but flagged. If you want to prevent a request, use `block`.

**Rule order matters only for tiebreaking.** The most-restrictive algorithm means you do not need to worry about rule ordering for correctness. However, placing your most critical `block` rules first in the file makes the policy easier to read and audit.

**Test every rule combination.** Use the raigo testing framework to write test cases that verify the resolution behaviour for prompts that match multiple rules. See [testing-framework.md](./testing-framework.md) for the test case format.

---

## DSL Changes in 0.2.0

The following fields were added to the rule schema in version 0.2.0 to support conflict resolution:

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `priority` | integer | No | `0` | Higher value = higher priority within same action+severity level |

No existing fields were changed. Policies written for version `1.0` of the spec are fully compatible with the 0.2.0 engine.
