---
name: raigo
description: "RAIGO Agent Firewall — declarative AI policy enforcement for OpenClaw agents. Evaluates every sensitive action against your organisation's security policy before it executes. Blocks prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks. Works in two modes: compiled (no engine required) or engine (real-time HTTP evaluation)."
homepage: https://raigo.ai/docs/openclaw
metadata:
  {
    "openclaw":
      {
        "emoji": "🛡️",
        "requires": { "bins": ["curl"] },
      },
  }
---

# RAIGO Agent Firewall

RAIGO is a declarative policy standard that enforces your organisation's security rules before an agent acts. It blocks prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks.

This skill works in two modes. **Use whichever fits your setup** — both provide meaningful protection.

---

## Mode 1 — Compiled / Agent Firewall (no engine required)

In this mode, your policy rules are compiled directly into the agent's context. No HTTP calls, no running service, no secrets to manage. The agent evaluates actions against the embedded rules inline.

**Setup (one time):**

```bash
# Generate a policy file for OpenClaw
npx @periculo/raigo openclaw --org "Your Organisation" --domain yourdomain.com

# Compile the rules into this skill's context
npx @periculo/raigo compile openclaw_af.raigo --target openclaw
```

The compiled output contains a `soul_md_preamble` block. Copy its contents into your `SOUL.md` (or the agent's system prompt) so the rules are active on every run.

**Enforcement in compiled mode:**

Before any sensitive action, evaluate the proposed action against the embedded rules below (in the `## Active Policy Rules` section, if present). If a rule matches:

- **DENY** — do not execute the action. Tell the user: "This action was blocked by your organisation's security policy. Rule: [rule_id]. [enforcement_message]"
- **WARN** — proceed, but prepend: "Security note: [enforcement_message]"
- **ALLOW** (no match) — proceed normally

---

## Mode 2 — Engine (real-time blocking + full audit trail)

In this mode, the RAIGO Engine runs as a lightweight HTTP service. The agent calls it before each sensitive action and receives a deterministic `ALLOW`, `DENY`, or `WARN` decision.

**Setup:**

```bash
# Self-hosted (Docker)
docker run -p 8181:8181 \
  -v $(pwd)/openclaw_af.raigo:/policy.raigo \
  ghcr.io/periculolimited/raigo-engine:latest

# Or use raigo cloud (managed, zero infrastructure)
# https://cloud.raigo.ai
```

Check the engine is running:

```bash
curl -s http://localhost:8181/v1/health
```

**Calling the engine before an action:**

```bash
curl -s -X POST http://localhost:8181/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<action you are about to take>",
    "context": {
      "tool": "openclaw",
      "environment": "production"
    }
  }'
```

**Interpreting the response:**

```json
{
  "action": "DENY",
  "http_status": 403,
  "error_code": "RAIGO_DENY_AF01",
  "user_message": "This request was blocked by your agent security policy.",
  "developer_message": "AF-01: Prompt injection pattern detected. Blocked per OWASP LLM01.",
  "triggered_rules": ["AF-01"],
  "audit_log": {
    "timestamp": "2026-03-25T10:00:00.000Z",
    "rule_id": "AF-01",
    "severity": "critical"
  }
}
```

| Decision | Required action |
|---|---|
| `ALLOW` | Proceed normally |
| `WARN` | Proceed, prepend `user_message` to your response |
| `DENY` | Stop. Do not execute. Report `user_message` to the user. |

**If the engine is unreachable:** fall back to compiled mode (Mode 1) if policy rules are embedded in context. If no rules are available, apply the default safe posture below.

---

## When to Evaluate

Regardless of mode, evaluate before:

1. Executing any shell command
2. Deleting, modifying, or moving files
3. Making any external API call or HTTP request
4. Accessing, reading, or writing a database
5. Sending any message, email, or notification
6. Processing or returning data that may contain personal information
7. Any action involving financial transactions or payments

You do NOT need to evaluate for:
- Reading files you have already been given access to
- Internal reasoning and planning steps
- Responding to simple factual questions with no external actions

---

## Default Safe Posture (no policy file)

If no `.raigo` file is found and no compiled rules are present, apply these baseline rules:

- Never transmit credentials, API keys, tokens, or secrets to external systems
- Never write or execute code that deletes data without explicit confirmation in the task
- Never impersonate a human or claim to be a person when communicating externally
- Never access systems or data outside the scope defined in the task
- Flag any task involving financial transactions, legal commitments, or public communications for human review before proceeding

---

## Updating Your Policy

Edit `~/.openclaw/openclaw_af.raigo` and recompile:

```bash
npx @periculo/raigo compile openclaw_af.raigo --target openclaw
```

In engine mode, the engine hot-reloads changes within 5 seconds — no restart needed.

---

## More Information

- [RAIGO Documentation](https://raigo.ai/docs)
- [OpenClaw Integration Guide](https://raigo.ai/docs/openclaw)
- [raigo cloud](https://cloud.raigo.ai)
- [Discord community](https://discord.gg/8VDgbrju)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Report an Issue](https://github.com/PericuloLimited/raigo/issues)
