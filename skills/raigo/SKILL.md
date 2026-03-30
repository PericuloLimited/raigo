---
name: raigo
description: Enforce your organisation's AI policies in real time. Before executing any sensitive action — writing code, sending messages, querying databases, handling personal data, or calling external APIs — evaluate the prompt against your raigo policy engine. Use this skill whenever an action could violate data protection, security, or compliance rules. Blocks, warns, or allows based on your compiled .raigo policy.
license: Proprietary. See https://raigo.ai for terms.
compatibility: Requires internet access to reach your raigo Cloud endpoint. Compatible with Claude Code, Manus, and any agent that supports AgentSkills.
metadata:
  author: periculo
  version: "1.0"
  homepage: https://raigo.ai
  cloud: https://cloud.raigo.ai
allowed-tools: Bash(curl:*)
---

# raigo — Runtime AI Policy Enforcement

raigo evaluates every sensitive agent action against your organisation's compiled policy before it executes. It is the enforcement layer between your AI agents and the outside world.

## Setup (one time)

Before using this skill, you need a raigo Cloud account and API key.

1. Sign up at **https://cloud.raigo.ai** (invite required — request access at https://cloud.raigo.ai/request-access)
2. In raigo Cloud, upload your organisation's policy documents and compile your engine
3. Copy your **API key** from the API Keys section of your dashboard
4. Set the following environment variables in your agent environment:

```
RAIGO_API_KEY=rgo_live_xxxxxxxxxxxxxxxx
RAIGO_ENDPOINT=https://cloud.raigo.ai/v1/evaluate
```

> If you are self-hosting the raigo engine, replace `RAIGO_ENDPOINT` with your own deployment URL.

---

## When to evaluate

Call the raigo engine **before** any of the following:

- Writing, modifying, or deleting files that may contain personal data or credentials
- Sending messages, emails, or notifications on behalf of users
- Querying or mutating databases
- Calling external APIs with user data in the payload
- Executing shell commands that could affect system state
- Generating content that references named individuals, health information, or financial data
- Any action the user's prompt explicitly flags as sensitive

When in doubt, evaluate. The engine responds in under 5ms and has no meaningful latency cost.

---

## How to evaluate a prompt

Run the evaluation script, passing the prompt text and optional context:

```bash
scripts/evaluate.sh "The prompt or action description to evaluate"
```

Or with context metadata:

```bash
scripts/evaluate.sh "prompt text" '{"tool":"claude-code","agent_id":"my-agent","channel":"terminal"}'
```

The script reads `RAIGO_API_KEY` and `RAIGO_ENDPOINT` from the environment.

---

## Interpreting the result

The engine returns a JSON object. The `action` field is the decision:

| `action` | Meaning | What to do |
|----------|---------|------------|
| `ALLOW`  | Prompt passes all policy rules | Proceed with the action |
| `WARN`   | Prompt triggers a warning-level rule | Proceed with caution; log the warning; inform the user |
| `DENY`   | Prompt violates a policy rule | **Stop immediately.** Do not execute the action. Inform the user with the `userMessage` field. |

**Always honour a `DENY`.** Do not attempt to rephrase the prompt and retry — this constitutes a policy bypass attempt and will be logged.

### Example ALLOW response

```json
{
  "action": "ALLOW",
  "processingMs": 2,
  "engineMode": "enforce"
}
```

### Example DENY response

```json
{
  "action": "DENY",
  "ruleId": "BL-PII-001",
  "ruleName": "Credit card number detected",
  "severity": "critical",
  "userMessage": "This action was blocked because it contains payment card data. Refer to your data handling policy.",
  "complianceRefs": ["PCI-DSS-3.4", "GDPR-Art5"],
  "processingMs": 3,
  "engineMode": "enforce"
}
```

### Observe mode

If your engine is in **observe mode**, all responses will return `action: "ALLOW"` so agents are never blocked. The true verdict is still logged in raigo Cloud for review. Shadow fields (`shadowAction`, `shadowRuleId`, `shadowRuleName`) are included in the response for informational logging.

---

## Handling a DENY

When the engine returns `DENY`:

1. **Stop the action** — do not execute the original request
2. **Surface the message** — show the user the `userMessage` field from the response, or a default: *"This action was blocked by your organisation's AI policy."*
3. **Do not retry** — do not modify the prompt and call evaluate again
4. **Log the event** — the violation is already logged in raigo Cloud; no additional action needed

---

## Handling a WARN

When the engine returns `WARN`:

1. **Proceed with caution** — the action is permitted but flagged
2. **Inform the user** — surface the `userMessage` if present
3. **Log locally** — note the warning in your session context

---

## Full request format

For advanced integrations, call the API directly:

```
POST https://cloud.raigo.ai/v1/evaluate
Authorization: Bearer <RAIGO_API_KEY>
Content-Type: application/json

{
  "prompt": "The full text of the action or prompt to evaluate",
  "context": {
    "tool": "claude-code",
    "agent_id": "optional-agent-identifier",
    "tool_name": "write_file",
    "channel": "terminal"
  },
  "metadata": {
    "session_id": "abc123"
  }
}
```

See [references/API.md](references/API.md) for the complete API reference.

---

## Troubleshooting

See [references/TROUBLESHOOTING.md](references/TROUBLESHOOTING.md) for common issues.
