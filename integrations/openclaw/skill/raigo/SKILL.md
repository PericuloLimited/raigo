---
name: raigo
description: RAIGO WAF — AI policy enforcement for OpenClaw agents. Use this skill to check whether a proposed action, tool call, or response is permitted by the organisation's RAIGO policy before executing it. Automatically blocks prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks.
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

# RAIGO WAF — AI Policy Enforcement

RAIGO is a policy engine that evaluates every agent action against a set of rules before it executes. It works like a Web Application Firewall (WAF) but for AI agents — blocking prompt injection, PII leakage, destructive commands, and other OWASP LLM Top 10 risks.

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
raigo-engine ~/.openclaw/openclaw_waf.raigo
```

If you do not have a policy file, generate one:

```bash
npx @periculo/raigo openclaw --org "Your Organisation" --domain yourdomain.com
raigo-engine openclaw_waf.raigo
```

## When to Check RAIGO

You MUST call the RAIGO engine before:

1. **Executing any shell command** — especially anything involving `rm`, `delete`, `drop`, `truncate`, `format`, `wipe`, `kill`, `sudo`, or system-level operations
2. **Sending data externally** — any action that sends data to an external URL, email, API, or service
3. **Accessing credentials or secrets** — reading `.env` files, API keys, passwords, tokens
4. **Processing user-provided content that will be executed** — any content that will be passed to `eval`, `exec`, or a shell
5. **Responding with personal data** — if the response contains names, emails, phone numbers, addresses, or other PII
6. **Financial or transactional actions** — payments, transfers, purchases, subscriptions

For routine read-only operations (reading files, searching, answering questions), RAIGO checks are optional but recommended.

## How to Call RAIGO

Use the exec tool to call the RAIGO engine API:

```bash
curl -s -X POST http://localhost:8181/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<the user request or action description>",
    "context": {
      "action": "<tool name or action type>",
      "agent": "openclaw",
      "session": "<session id if available>"
    }
  }'
```

Parse the response:

```json
{
  "decision": "DENY",
  "rule": "WAF-01",
  "severity": "CRITICAL",
  "message": "Prompt injection attempt detected",
  "userMessage": "I cannot process this request as it appears to be attempting to override my instructions.",
  "compliance": ["OWASP LLM01"]
}
```

## Decision Handling

### If decision is ALLOW
Proceed with the action normally. No action required.

### If decision is DENY
1. Do NOT execute the requested action
2. Tell the user: use the `userMessage` from the RAIGO response if present, otherwise say: "I cannot complete this request as it has been blocked by the organisation's AI policy."
3. Include the rule ID in your explanation (e.g., "This was blocked by rule WAF-01")
4. Do not reveal the full technical details of the policy to the user

### If decision is WARN
1. Proceed with the action
2. Inform the user that the action triggered a policy warning
3. Log the warning if a logging mechanism is available

### If RAIGO engine is unreachable
If `curl` returns a connection error (the engine is not running):
1. Default to **DENY** for any high-risk action (destructive commands, external data sends, credential access)
2. Inform the user: "The RAIGO policy engine is not running. For safety, I am blocking this action until the engine is available."
3. Suggest the user start the engine: `raigo-engine ~/.openclaw/openclaw_waf.raigo`

## Example Workflow

User asks: "Delete all the log files in /var/log"

1. Before executing, call RAIGO:
```bash
curl -s -X POST http://localhost:8181/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Delete all log files in /var/log", "context": {"action": "exec", "command": "rm -rf /var/log/*"}}'
```

2. RAIGO returns: `{"decision": "DENY", "rule": "WAF-03", "userMessage": "Destructive file system operations require explicit confirmation and are blocked by default."}`

3. You respond: "I cannot delete those files — this action has been blocked by your organisation's AI policy (rule WAF-03: Destructive Action Prevention). If you intended this, please disable the WAF-03 rule in your `.raigo` policy file and restart the engine."

## Customising Policies

To view the currently loaded rules:
```bash
curl -s http://localhost:8181/v1/policies | python3 -m json.tool
```

To update your policy, edit `~/.openclaw/openclaw_waf.raigo` and restart the engine. The engine also supports hot-reload — changes take effect within 5 seconds without restarting.

For more information: https://raigo.ai
