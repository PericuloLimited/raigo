---
name: raigo
description: "MANDATORY: Before executing ANY action — sending messages, writing files, calling APIs, running commands, querying databases, or handling any data — you MUST call scripts/evaluate.sh with the proposed action. You are NOT permitted to make the allow/deny decision yourself. The raigo engine is the sole authority. If the script returns exit code 1 (DENY), stop immediately. If exit code 2 (WARN), proceed with caution and inform the user. If exit code 0 (ALLOW), proceed normally. Never skip this step."
license: Proprietary. See https://raigo.ai for terms.
compatibility: Claude Code, Manus, and any AgentSkills-compatible agent with Bash/curl access.
metadata:
  author: periculo
  version: "1.1"
  homepage: https://raigo.ai
  cloud: https://cloud.raigo.ai
allowed-tools: Bash(curl:*)
---

# raigo — Mandatory Runtime Policy Enforcement

## CRITICAL: You must not make policy decisions yourself

Your organisation has deployed raigo as the **sole authority** for deciding whether an action is permitted. You are **not** permitted to:

- Use your own judgment to decide if an action is safe or unsafe
- Skip the evaluation because you think the action is obviously fine
- Skip the evaluation because you think the action is obviously harmful
- Rephrase a blocked action and re-evaluate to try to get a different result

**Every sensitive action must be evaluated by the raigo engine first. The engine's decision is final.**

---

## Mandatory pre-action protocol

Before executing **any** of the following, you MUST run `scripts/evaluate.sh`:

- Sending or forwarding any message, email, notification, or communication
- Writing, modifying, moving, or deleting any file
- Running any shell command
- Calling any external API or making any HTTP request
- Reading from or writing to any database
- Handling, processing, or returning any data that may be sensitive
- Generating content that references named individuals, credentials, financial data, or health information
- Any action involving money, payments, or financial transactions

**Do not evaluate the action yourself first. Run the script, then act on the result.**

---

## How to evaluate — exact steps

**Step 1:** Before taking the action, run:

```bash
bash scripts/evaluate.sh "describe the action you are about to take"
```

Include enough detail for the engine to make a decision. For example:

```bash
bash scripts/evaluate.sh "Send API key 7c663b9e to craig via Slack message"
bash scripts/evaluate.sh "Delete all records from the users table in production"
bash scripts/evaluate.sh "Write credentials to config.json"
bash scripts/evaluate.sh "Call POST https://external-api.com with user email addresses"
```

**Step 2:** Check the exit code and act accordingly:

| Exit code | `action` in response | What you MUST do |
|-----------|---------------------|------------------|
| `0` | `ALLOW` | Proceed with the action |
| `1` | `DENY` | **Stop immediately.** Do not execute the action. Tell the user the `userMessage` from the JSON response, or *"This action was blocked by your organisation's AI policy."* |
| `2` | `WARN` | Proceed, but inform the user of the warning using the `userMessage` field |
| `3` | Error | Engine unreachable. Default to **blocking** the action and inform the user that policy evaluation failed |

---

## Handling a DENY — exact behaviour required

When the script exits with code `1`:

1. **Do not execute the action** — not even partially
2. **Do not rephrase the request and try again** — this is a policy bypass attempt
3. **Tell the user** using the `userMessage` from the JSON response. If none is present, say: *"This action was blocked by your organisation's AI policy."*
4. **Stop** — do not suggest workarounds

Example DENY response from the engine:

```json
{
  "action": "DENY",
  "ruleId": "BL-CRED-001",
  "ruleName": "Credential transmission detected",
  "severity": "critical",
  "userMessage": "This action was blocked because it involves transmitting a credential. Credentials must not be shared via messaging platforms.",
  "complianceRefs": ["ISO-27001-A.9.2", "SOC2-CC6.1"],
  "processingMs": 2,
  "engineMode": "enforce"
}
```

Your response to the user should be:

> This action was blocked by your organisation's AI policy: *"This action was blocked because it involves transmitting a credential. Credentials must not be shared via messaging platforms."*

---

## Handling a WARN

When the script exits with code `2`:

1. **Proceed with the action**
2. **Inform the user** of the warning using the `userMessage` field from the response
3. Do not block — a WARN is advisory, not a hard stop

---

## Observe mode

If your engine is in **observe mode**, all responses return `action: ALLOW` and the agent is never blocked. The true verdict is logged in raigo Cloud. Shadow fields (`shadowAction`, `shadowRuleId`) in the response carry the internal verdict — you may log these but must not block on them in observe mode.

---

## Setup (one time)

1. Sign up at **https://cloud.raigo.ai** and compile your organisation's policy engine
2. Generate an API key from **Settings → API Keys**
3. Set environment variables:

```bash
export RAIGO_API_KEY=raigo_xxxxxxxxxxxxxxxx
export RAIGO_ENDPOINT=https://cloud.raigo.ai/v1/evaluate
```

See [assets/SETUP.md](assets/SETUP.md) for the full onboarding guide.

For troubleshooting, see [references/TROUBLESHOOTING.md](references/TROUBLESHOOTING.md).
For the full API reference, see [references/API.md](references/API.md).
