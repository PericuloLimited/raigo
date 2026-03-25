---
name: raigo
description: "RAIGO Agent Firewall — declarative AI policy enforcement for OpenClaw agents. Evaluates every sensitive action against your organisation's security policy before it executes. Blocks prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks."
homepage: https://raigo.ai/docs/openclaw
metadata:
  {
    "openclaw":
      {
        "emoji": "🛡️",
        "requires": { "bins": ["curl"] },
        "install":
          [
            {
              "id": "raigo-engine",
              "kind": "node",
              "package": "@periculo/raigo-engine",
              "bins": ["raigo-engine"],
              "label": "Install RAIGO Engine",
            },
          ],
      },
  }
---

# RAIGO Agent Firewall

RAIGO is a policy engine that evaluates agent actions against a set of declarative rules before they execute. It acts as an **Agent Firewall (AF)** — blocking prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks in under 2ms per evaluation.

## How It Works

The RAIGO Engine runs locally as a small HTTP server on `http://localhost:8181`. Before any sensitive action, you call the engine with the proposed prompt or action. The engine returns a decision: `ALLOW`, `DENY`, or `WARN`.

- **ALLOW** — proceed normally
- **DENY** — stop immediately, explain the block to the user, do not execute the action
- **WARN** — proceed with caution, log the warning, inform the user

## Required Setup

Before using this skill, the RAIGO Engine must be running. Check if it is running:

```bash
curl -s http://localhost:8181/v1/health
```

If it is not running, start it:

```bash
raigo-engine ~/.openclaw/openclaw_af.raigo
```

If you do not have a policy file yet, generate one in 5 seconds:

```bash
npx @periculo/raigo openclaw --org "Your Organisation" --domain yourdomain.com
raigo-engine openclaw_af.raigo
```

## When to Call RAIGO

You MUST call the RAIGO engine before:

1. **Executing any shell command** (exec tool, terminal commands)
2. **Deleting, modifying, or moving files**
3. **Making any external API call or HTTP request**
4. **Accessing, reading, or writing a database**
5. **Sending any message, email, or notification**
6. **Processing or returning data that may contain personal information**
7. **Any action involving financial transactions or payments**

You do NOT need to call RAIGO for:
- Reading files you have already been given access to
- Internal reasoning and planning steps
- Responding to simple factual questions with no external actions

## How to Call RAIGO

Use the exec tool to call the engine. Replace `<prompt_text>` with the action you are about to take:

```bash
curl -s -X POST http://localhost:8181/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<prompt_text>",
    "context": {
      "tool": "openclaw",
      "environment": "production"
    }
  }'
```

## Interpreting the Response

The engine returns a JSON object. Read the `action` field:

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

**If `action` is `DENY`:**
- Do NOT execute the action
- Tell the user: "I cannot complete this request. It was blocked by your organisation's security policy. Rule: [error_code]. [user_message]"
- Do not attempt to work around the block or rephrase the request

**If `action` is `WARN`:**
- Proceed with the action
- Tell the user: "Note: This action triggered a security warning. [user_message]"

**If `action` is `ALLOW`:**
- Proceed normally

**If the engine is unreachable (connection refused):**
- Stop and tell the user: "The RAIGO Agent Firewall is not running. Please start it with: `raigo-engine ~/.openclaw/openclaw_af.raigo`"
- Do NOT proceed with the action (fail-safe by default)

## Example Workflow

When a user asks you to "delete all log files older than 30 days":

1. Before executing, call RAIGO with the proposed action:
   ```bash
   curl -s -X POST http://localhost:8181/v1/evaluate \
     -H "Content-Type: application/json" \
     -d '{"prompt": "delete all log files older than 30 days using find and rm"}'
   ```

2. If the response `action` is `ALLOW`, proceed with the deletion.
3. If the response `action` is `DENY`, stop and explain: "This action was blocked by your security policy (AF-03: Destructive action detected). If you intended this, please update your RAIGO policy to allow it."

## Checking RAIGO Status

At the start of any session where you will be taking actions, check that RAIGO is running:

```bash
curl -s http://localhost:8181/v1/health | python3 -m json.tool
```

If it is not running, inform the user immediately before proceeding with any actions.

## Policy File Location

The default policy file location is `~/.openclaw/openclaw_af.raigo`. You can also check what policies are loaded:

```bash
curl -s http://localhost:8181/v1/policies | python3 -m json.tool
```

## Updating Your Policy

To add a custom rule, edit `~/.openclaw/openclaw_af.raigo`. The engine hot-reloads changes within 5 seconds — no restart needed. For example, to block discussion of competitor products:

```yaml
- id: "BIZ-01"
  domain: "Business Policy"
  title: "Do not discuss competitor products"
  condition:
    trigger: "prompt_contains"
    keywords: ["CompetitorA", "CompetitorB"]
    match: "any"
  action: "WARN"
  severity: "low"
  directive: "Do not make comparisons with competitor products."
  enforcement_message: "WARNING: This query relates to a competitor product."
```

## More Information

- [RAIGO Documentation](https://raigo.ai/docs)
- [OpenClaw Integration Guide](https://raigo.ai/docs/openclaw)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Report an Issue](https://github.com/PericuloLimited/raigo/issues)
