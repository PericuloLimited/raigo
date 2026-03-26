# Observe Mode (Warn-First Onboarding)

## Overview

When you first deploy the raigo engine, all DENY rules are automatically downgraded to WARN. This is called **Observe mode**. Nothing is blocked; every request passes through and every policy match is logged as a warning. This lets you see exactly what your rules would have blocked across your real traffic before committing to enforcement.

Once you are confident your rules are correct and complete, you switch the engine to **Enforce mode** — at which point DENY rules become active and requests that match them are rejected.

This pattern is directly inspired by how mature security tools onboard: WAFs start in detection mode, SELinux starts in permissive mode, and network firewalls start with logging-only rules. The same principle applies to AI policy enforcement.

---

## Engine Modes

| Mode | ALLOW | WARN | DENY |
|---|---|---|---|
| `observe` | Passes through | Logged as warning | Downgraded to warning, passes through |
| `enforce` | Passes through | Logged as warning | Request rejected with 403 |

The mode is set at the **organisation level**, not per-rule. All rules in the policy are subject to the same mode.

---

## API Behaviour in Observe Mode

When the engine is in Observe mode and a DENY rule matches, the evaluate response includes an `observeOverride` flag:

```json
{
  "action": "WARN",
  "policyMessage": "Prompt contains restricted content (PII detected)",
  "matchedRules": ["no-pii"],
  "observeOverride": true,
  "engineMode": "observe"
}
```

The `observeOverride: true` field signals to the caller that this result was originally a DENY that was downgraded. Callers can use this to:

- Log the event with a different severity
- Surface a "would have been blocked" indicator in their UI
- Build a report of what Enforce mode would have blocked

---

## Switching Modes

### Self-hosted engine (CLI / config file)

Set `engineMode` in your `raigo.config.yaml`:

```yaml
engine:
  mode: observe   # or "enforce"
```

Or pass it as an environment variable:

```bash
RAIGO_ENGINE_MODE=enforce raigo serve
```

### REST API (management endpoint)

```http
PATCH /v1/engine/mode
Authorization: Bearer <admin-key>
Content-Type: application/json

{ "mode": "enforce" }
```

Response:

```json
{ "engineMode": "enforce", "updatedAt": "2026-03-26T10:00:00Z" }
```

---

## Recommended Onboarding Workflow

1. **Deploy in Observe mode** (default). Connect your first integration.
2. **Run real traffic for 7–14 days.** Review the violation log — every WARN with `observeOverride: true` is a request that would have been blocked.
3. **Tune your rules.** Remove false positives, tighten rules that are too broad, add rules for gaps you observe.
4. **Switch to Enforce mode** when the false-positive rate is acceptable.
5. **Monitor the violation log** for the first 48 hours after switching. Roll back to Observe mode if unexpected blocks appear.

---

## Observe Mode in the Policy File

The engine mode is not stored in the `.raigo` policy file itself — it is a runtime configuration. This means you can share the same policy file across environments (dev in Observe, prod in Enforce) without modifying the policy.

```yaml
# master.raigo — same file in both environments
version: "0.5.0"
rules:
  - id: no-pii
    action: DENY
    condition: "contains_pii(prompt)"
    message: "PII detected in prompt"
```

```bash
# Development
RAIGO_ENGINE_MODE=observe raigo serve --policy master.raigo

# Production
RAIGO_ENGINE_MODE=enforce raigo serve --policy master.raigo
```

---

## Testing Against Both Modes

The raigo test framework supports asserting expected behaviour in both modes:

```yaml
# tests/pii-detection.yaml
suite: PII Detection
policy: ../policies/pii.raigo

cases:
  - name: "SSN in prompt — observe mode"
    engineMode: observe
    input:
      prompt: "My SSN is 123-45-6789"
    expect:
      action: WARN
      observeOverride: true

  - name: "SSN in prompt — enforce mode"
    engineMode: enforce
    input:
      prompt: "My SSN is 123-45-6789"
    expect:
      action: DENY
```

Run with:

```bash
raigo test tests/pii-detection.yaml
```

---

## Related

- [Conflict Resolution](./conflict-resolution.md) — how multiple rules interact
- [Testing Framework](./testing-framework.md) — writing and running policy tests
- [Quickstart](./quickstart.md) — getting the engine running locally
