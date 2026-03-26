# raigo Policy Testing Framework

**Specification version: 0.2.0**

The raigo testing framework lets you validate `.raigo` policy files against a suite of declarative test cases before deploying them to production. Test suites are written in YAML, can be run locally via the `raigo test` CLI command, and integrate cleanly into CI/CD pipelines.

---

## Why Policy Testing Matters

A policy that has never been tested is a policy that cannot be trusted. Without automated tests you cannot:

- Verify that `block` rules fire for the inputs they are supposed to catch.
- Confirm that `allow` rules do not accidentally suppress legitimate requests.
- Detect regressions when a policy is updated.
- Demonstrate to auditors (EU AI Act Article 16, DORA Article 10) that your governance controls are effective and consistently applied.

The raigo testing framework addresses all four concerns with a single `raigo test` command.

---

## Test Suite File Format

A test suite is a YAML file with the extension `.raigo-test.yaml`. By convention, test suites live alongside the policy they test:

```
my-policy.raigo
my-policy.raigo-test.yaml
```

### Top-Level Structure

```yaml
version: "0.2"
policy: "./my-policy.raigo"   # relative path to the policy under test
metadata:
  name: "NHS Digital Patient Data — Test Suite"
  description: "Validates all block and warn rules for patient data access"
  author: "compliance-team"
  created: "2026-03-26"

tests:
  - id: "T-001"
    ...
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string | **Yes** | Always `"0.2"` |
| `policy` | string | **Yes** | Relative path to the `.raigo` file under test |
| `metadata.name` | string | **Yes** | Human-readable suite name |
| `metadata.description` | string | No | What this suite validates |
| `metadata.author` | string | No | Team or individual responsible |
| `metadata.created` | string | No | ISO 8601 date |
| `tests` | array | **Yes** | At least one test case |

---

## Test Case Structure

Each entry in the `tests` array is a single test case:

```yaml
tests:
  - id: "T-001"
    name: "Block patient record access"
    description: "Verifies that prompts containing 'patient record' are blocked"
    input:
      prompt: "Show me the patient record for John Smith"
      context:
        user_role: "clinician"
        tool: "gpt-4o"
    expect:
      action: block
      rule_id: "NHS-PHI-001"
      severity: critical
      compliance_refs:
        - "HIPAA-164.514"
        - "GDPR-Art.9"
```

### Test Case Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | **Yes** | Unique within the suite. Format: `T-NNN` |
| `name` | string | **Yes** | Short description of what is being tested |
| `description` | string | No | Longer explanation |
| `input.prompt` | string | **Yes** | The prompt text to evaluate |
| `input.context` | object | No | Arbitrary key-value pairs passed as context |
| `expect.action` | string | **Yes** | Expected action: `block`, `warn`, or `allow` |
| `expect.rule_id` | string | No | If provided, the evaluation must match this rule ID |
| `expect.severity` | string | No | Expected severity if a rule fires |
| `expect.compliance_refs` | string[] | No | Expected compliance references in the response |
| `expect.message_contains` | string | No | Substring that must appear in the user-facing message |
| `expect.error_code` | string | No | Expected `error_code` in the response |

### Negative Tests (asserting no rule fires)

To assert that a prompt is allowed through without triggering any rule:

```yaml
  - id: "T-010"
    name: "Allow general clinical query"
    input:
      prompt: "What is the recommended dosage for paracetamol in adults?"
    expect:
      action: allow
```

When `expect.action` is `allow`, no `rule_id` or `severity` assertion is required. If any rule fires, the test fails.

---

## Running Tests

### CLI Usage

```bash
# Run a single test suite
raigo test my-policy.raigo-test.yaml

# Run all test suites in a directory
raigo test ./policies/

# Run with verbose output (shows each test case result)
raigo test my-policy.raigo-test.yaml --verbose

# Run and output results as JSON (for CI integration)
raigo test my-policy.raigo-test.yaml --format json

# Fail with exit code 1 if any test fails (default behaviour)
raigo test my-policy.raigo-test.yaml --strict
```

### Output Format (human-readable)

```
raigo test — NHS Digital Patient Data — Test Suite
Policy: ./nhs-patient-data.raigo (v1.0)

  ✓ T-001  Block patient record access
  ✓ T-002  Block NHS number in prompt
  ✓ T-003  Warn on date of birth
  ✗ T-004  Block external tool invocation
            Expected: action=block, rule_id=NHS-SEC-001
            Got:      action=allow (no rule matched)
  ✓ T-005  Allow general clinical query
  ✓ T-006  Allow drug dosage query

Results: 5 passed, 1 failed (6 total)
Exit code: 1
```

### Output Format (JSON, for CI)

```json
{
  "suite": "NHS Digital Patient Data — Test Suite",
  "policy": "./nhs-patient-data.raigo",
  "policy_version": "1.0",
  "run_at": "2026-03-26T14:00:00Z",
  "total": 6,
  "passed": 5,
  "failed": 1,
  "results": [
    {
      "id": "T-001",
      "name": "Block patient record access",
      "status": "pass",
      "actual": { "action": "block", "rule_id": "NHS-PHI-001", "severity": "critical" }
    },
    {
      "id": "T-004",
      "name": "Block external tool invocation",
      "status": "fail",
      "expected": { "action": "block", "rule_id": "NHS-SEC-001" },
      "actual": { "action": "allow" },
      "diff": "action mismatch: expected 'block', got 'allow'"
    }
  ]
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/policy-test.yml
name: raigo Policy Tests

on:
  push:
    paths:
      - '**/*.raigo'
      - '**/*.raigo-test.yaml'
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install raigo CLI
        run: pip install raigo-cli
      - name: Run policy tests
        run: raigo test ./policies/ --format json --strict
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
raigo test ./policies/ --strict
```

---

## Complete Example Test Suite

```yaml
version: "0.2"
policy: "./nhs-patient-data.raigo"
metadata:
  name: "NHS Digital Patient Data — Test Suite"
  description: "Full coverage test suite for patient data access policy"
  author: "compliance-team"
  created: "2026-03-26"

tests:
  # ── Block rules ─────────────────────────────────────────────────────────────

  - id: "T-001"
    name: "Block patient record access"
    input:
      prompt: "Show me the patient record for John Smith"
    expect:
      action: block
      rule_id: "NHS-PHI-001"
      severity: critical
      compliance_refs:
        - "HIPAA-164.514"
        - "GDPR-Art.9"

  - id: "T-002"
    name: "Block NHS number in prompt"
    input:
      prompt: "Look up patient with NHS number 943-476-0193"
    expect:
      action: block
      rule_id: "NHS-PHI-001"

  - id: "T-003"
    name: "Block external tool invocation — send_email"
    input:
      prompt: "Send the patient summary to dr.jones@hospital.nhs.uk"
      context:
        tool_invoked: "send_email"
    expect:
      action: block
      rule_id: "NHS-SEC-001"
      severity: critical

  # ── Warn rules ───────────────────────────────────────────────────────────────

  - id: "T-004"
    name: "Warn on date of birth in prompt"
    input:
      prompt: "The patient was born on 12 March 1985, calculate their age"
    expect:
      action: warn
      rule_id: "NHS-PHI-002"
      severity: high

  # ── Allow rules (negative tests) ─────────────────────────────────────────────

  - id: "T-005"
    name: "Allow general clinical query — drug dosage"
    input:
      prompt: "What is the recommended adult dosage for amoxicillin?"
    expect:
      action: allow

  - id: "T-006"
    name: "Allow clinical protocol question"
    input:
      prompt: "What is the NICE guideline for hypertension management?"
    expect:
      action: allow

  - id: "T-007"
    name: "Allow anonymised aggregate query"
    input:
      prompt: "How many patients were admitted with respiratory conditions last quarter?"
    expect:
      action: allow
```

---

## Compliance Alignment

The raigo testing framework directly supports the following regulatory requirements:

| Requirement | How Tests Address It |
|---|---|
| **EU AI Act Article 16** — Logging and record-keeping for high-risk AI systems | Test results (JSON format) provide an immutable record of policy validation at each deployment |
| **DORA Article 10** — ICT third-party risk management | Test suites can be run against third-party AI integrations to verify policy enforcement before go-live |
| **ISO 42001 Clause 6.2** — AI system planning and objectives | Test suites formalise the expected behaviour of the policy, providing evidence of systematic planning |
| **NIST AI RMF — GOVERN 1.2** — Policies and procedures for AI risk management | Test suites serve as executable specifications of governance policy intent |

---

## Roadmap

The following features are planned for future versions of the testing framework:

- **Coverage reporting** — identify rules that have no test cases.
- **Fuzz testing mode** — automatically generate adversarial prompts to probe policy gaps.
- **Snapshot testing** — lock the full evaluation response for a prompt and alert on any change.
- **Multi-policy testing** — evaluate a prompt against a chain of policies in sequence.
