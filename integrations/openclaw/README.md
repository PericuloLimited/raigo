# RAIGO + OpenClaw Integration

> **Secure your OpenClaw agent in under 2 minutes.** RAIGO acts as an **Agent Firewall (AF)** — evaluating every prompt and action against your organisation's security policy before it executes. No configuration required.

---

## The Fastest Path: One Command

If you just want to protect your OpenClaw agent with sensible security defaults based on the **OWASP Top 10 for LLM Applications 2025**, run this:

```bash
# Install the RAIGO CLI
npm install -g @periculo/raigo

# Generate your Agent Firewall policy (5 seconds, no questions asked)
raigo openclaw --org "My Company" --domain mycompany.com

# Start the engine
raigo-engine openclaw_af.raigo
```

Your agent is now protected. That's it.

### What You Get

| Rule | Protects Against | OWASP Reference |
|---|---|---|
| AF-01 | Prompt injection, jailbreaks, DAN attacks | LLM01 |
| AF-02 | Personal data leaking in agent outputs | LLM02 / LLM06 |
| AF-03 | Destructive actions (delete, wipe, destroy) | LLM08 |
| AF-04 | Autonomous financial transactions | LLM08 |
| AF-05 | Code injection via external content | LLM05 |
| AF-06 | Overreliance on AI for professional advice | LLM09 |
| AF-07 | Unverified external tools and plugins | LLM03 / LLM07 |

---

## How the Integration Works

RAIGO integrates with OpenClaw using two complementary layers:

```
Inbound Message
      │
      ▼
┌─────────────────────────────────────────┐
│  Layer 1: RAIGO Hook (message:received) │  ← Early warning, screens raw input
│  Fires before agent sees the message    │
└─────────────────────────────────────────┘
      │
      ▼
Agent (Pi) processes message
      │
      ▼
┌─────────────────────────────────────────┐
│  Layer 2: RAIGO Skill (SKILL.md)        │  ← Primary enforcement
│  Agent calls engine before each action  │
└─────────────────────────────────────────┘
      │
      ├──► RAIGO Engine evaluates ──► DENY ──► Agent stops, explains to user
      │                           └──► ALLOW ──► Action executes
      ▼
Response to user
```

### Layer 1 — The Hook (Inbound Screening)

The RAIGO hook fires on OpenClaw's `message:received` event — before the agent sees the message. It calls the RAIGO Engine with the raw inbound content and pushes a warning back to the user if a DENY rule fires (e.g., a prompt injection attempt is detected in the message itself).

This is the **earliest possible interception point** in OpenClaw's architecture.

### Layer 2 — The Skill (Agent-Cooperative Enforcement)

The RAIGO skill (`SKILL.md`) injects instructions into the agent's context. The agent is instructed to call the RAIGO Engine before executing any sensitive action — shell commands, file deletions, external API calls, database operations, financial transactions, and responses containing personal data.

This is the **primary enforcement layer**. Because OpenClaw's agent (Pi) is instruction-following, the skill provides deterministic, policy-driven enforcement for the vast majority of real-world use cases.

---

## Step-by-Step Setup

### Step 1: Generate your policy

```bash
npm install -g @periculo/raigo
raigo openclaw --org "My Company" --domain mycompany.com
```

This creates `openclaw_af.raigo` in your current directory.

### Step 2: Start the RAIGO Engine

```bash
raigo-engine openclaw_af.raigo
```

Verify it is running:

```bash
curl -s http://localhost:8181/v1/health
```

### Step 3: Install the RAIGO Skill

Copy the skill into your OpenClaw skills directory:

```bash
# macOS / Linux
cp -r skill/raigo ~/.openclaw/skills/raigo

# Windows
xcopy /E /I skill\raigo %USERPROFILE%\.openclaw\skills\raigo
```

Move your policy file to the standard location:

```bash
mv openclaw_af.raigo ~/.openclaw/openclaw_af.raigo
```

### Step 4: Install the RAIGO Hook (Optional but Recommended)

```bash
# Copy the hook to your managed hooks directory
cp -r hook/raigo-af ~/.openclaw/hooks/raigo-af

# Enable it
openclaw hooks enable raigo-af

# Verify
openclaw hooks list
```

### Step 5: Restart OpenClaw

Restart your OpenClaw gateway to load the new skill and hook. The agent will now call RAIGO before every sensitive action.

---

## Customising Your Policy

The generated `openclaw_af.raigo` file is a standard RAIGO policy file. You can open it in any text editor and add your own rules. For example, to prevent the agent from discussing competitor products:

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

The engine hot-reloads changes within 5 seconds — no restart needed.

For a fully guided setup with industry-specific templates (Healthcare, Defence, Finance), run:

```bash
raigo setup
```

---

## Violation Response Format

When a rule fires, the engine returns a structured response:

```json
{
  "action": "DENY",
  "http_status": 403,
  "error_code": "RAIGO_DENY_AF01",
  "user_message": "This request was blocked by your agent's security policy.",
  "developer_message": "AF-01: Prompt injection or jailbreak pattern detected. Request blocked per OWASP LLM01.",
  "triggered_rules": ["AF-01"],
  "audit_log": {
    "timestamp": "2026-03-25T10:00:00.000Z",
    "policy_version": "1.0.0",
    "rule_id": "AF-01",
    "severity": "critical",
    "action": "DENY"
  }
}
```

---

## Deployment Options

| Model | How | Best For |
|---|---|---|
| **Local** | `raigo-engine openclaw_af.raigo` | Development, single-user agents |
| **Docker** | `docker run -v $(pwd):/policy periculo/raigo-engine` | Production, containerised deployments |
| **RAIGO Cloud** | Point engine at your cloud endpoint | Teams, managed governance, no ops |

---

## Links

- [RAIGO GitHub](https://github.com/PericuloLimited/raigo)
- [Full Documentation](https://raigo.ai/docs/openclaw)
- [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OpenClaw Hooks Documentation](https://docs.openclaw.ai/automation/hooks)
- [OpenClaw Skills Documentation](https://docs.openclaw.ai/tools/skills)
- [Report an Issue](https://github.com/PericuloLimited/raigo/issues)
