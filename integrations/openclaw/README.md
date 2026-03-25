# RAIGO + OpenClaw Integration

> **Secure your OpenClaw agent in under 2 minutes.** RAIGO acts as a WAF (Web Application Firewall) for your agent — evaluating every prompt and action against your security policy before it reaches the LLM. No configuration required.

---

## The Fastest Path: One Command

If you just want to protect your OpenClaw agent with sensible security defaults based on the **OWASP Top 10 for LLM Applications 2025**, run this:

```bash
# Install the RAIGO CLI
npm install -g @periculo/raigo

# Generate your security policy (5 seconds, no questions asked)
raigo openclaw --org "My Company" --domain mycompany.com

# Start the engine
raigo-engine openclaw_waf.raigo
```

Your agent is now protected. That's it.

### What You Get

| Rule | Protects Against | OWASP Reference |
|---|---|---|
| WAF-01 | Prompt injection, jailbreaks, DAN attacks | LLM01 |
| WAF-02 | Personal data leaking in agent outputs | LLM02 / LLM06 |
| WAF-03 | Destructive actions (delete, wipe, destroy) | LLM08 |
| WAF-04 | Autonomous financial transactions | LLM08 |
| WAF-05 | Code injection via external content | LLM05 |
| WAF-06 | Overreliance on AI for professional advice | LLM09 |
| WAF-07 | Unverified external tools and plugins | LLM03 / LLM07 |

---

## Step 2: Add the RAIGO Skill to OpenClaw

Copy [`raigo_skill.js`](./raigo_skill.js) into your OpenClaw skills directory:

```bash
# macOS / Linux
cp raigo_skill.js ~/.openclaw/skills/raigo.js

# Windows
copy raigo_skill.js %USERPROFILE%\.openclaw\skills\raigo.js
```

Then add the skill to your agent's `agent.json`:

```json
{
  "agent": {
    "name": "My Agent",
    "skills": ["raigo"],
    "raigo": {
      "engine_url": "http://localhost:8181",
      "mode": "enforce",
      "block_on_error": true
    }
  }
}
```

---

## How It Works

Every time your OpenClaw agent is about to send a prompt to an LLM, the RAIGO skill intercepts it first:

```
User Input
    │
    ▼
OpenClaw Agent
    │
    │  (before every LLM call)
    ▼
RAIGO Engine ──── DENY ────► Blocked (403 + structured violation response)
    │
    │  ALLOW
    ▼
LLM API (OpenAI, Anthropic, etc.)
    │
    ▼
Response to user
```

The evaluation happens in **under 2ms** and is **deterministic** — the engine does not ask an LLM whether something is allowed. It reads the rules and returns a binary decision. A `DENY` rule cannot be overridden by prompt injection, model drift, or a creative user.

---

## Customising Your Policy

The generated `openclaw_waf.raigo` file is a standard RAIGO policy file. You can open it in any text editor and add your own rules. For example, to prevent the agent from discussing competitor products:

```yaml
- id: "BIZ-01"
  domain: "Business Policy"
  title: "Do not discuss competitor products"
  condition:
    trigger: "prompt_contains"
    keywords: ["CompetitorA", "CompetitorB", "rival product"]
    match: "any"
  action: "WARN"
  severity: "low"
  directive: "Do not make comparisons with competitor products or services."
  enforcement_message: "WARNING: This query relates to a competitor product."
```

For a fully guided setup with industry-specific templates (Healthcare, Defence, Finance), run:

```bash
raigo setup
```

---

## Evaluation Request Format

The skill sends this payload to the RAIGO Engine on every agent action:

```json
{
  "prompt": "The full prompt text being sent to the LLM",
  "context": {
    "environment": "production",
    "tool": "openclaw",
    "data_classification": [],
    "agent_name": "My Agent"
  }
}
```

---

## Violation Response

When a rule fires, the engine returns a structured response your code can handle:

```json
{
  "action": "DENY",
  "http_status": 403,
  "error_code": "RAIGO_DENY_WAF01",
  "user_message": "This request was blocked by your agent's security policy.",
  "developer_message": "WAF-01: Prompt injection or jailbreak pattern detected. Request blocked per OWASP LLM01.",
  "triggered_rules": ["WAF-01"],
  "audit_log": {
    "timestamp": "2026-03-25T10:00:00.000Z",
    "policy_version": "1.0.0",
    "rule_id": "WAF-01",
    "severity": "critical",
    "action": "DENY"
  }
}
```

---

## Configuration Options

| Option | Default | Description |
|---|---|---|
| `engine_url` | `http://localhost:8181` | URL of the RAIGO Engine |
| `mode` | `enforce` | `enforce` blocks on DENY; `audit` logs but allows all |
| `block_on_error` | `true` | Block if the engine is unreachable (fail-safe) |
| `timeout_ms` | `2000` | Max time to wait for engine response |
| `log_violations` | `true` | Log all violations to console |

---

## Deployment Options

| Model | How | Best For |
|---|---|---|
| **Local** | `raigo-engine openclaw_waf.raigo` | Development, single-user agents |
| **Docker** | `docker run -v $(pwd):/policy periculo/raigo-engine` | Production, containerised deployments |
| **RAIGO Cloud** | Point `engine_url` at your cloud endpoint | Teams, managed governance, no ops |

---

## Links

- [RAIGO GitHub](https://github.com/PericuloLimited/raigo)
- [Full Documentation](https://raigo.ai/docs/openclaw)
- [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Report an Issue](https://github.com/PericuloLimited/raigo/issues)
