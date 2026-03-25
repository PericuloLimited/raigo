---
name: raigo-af
description: "RAIGO Agent Firewall hook — screens inbound messages against your RAIGO policy before the agent processes them. Fires on message:received to detect and flag prompt injection, jailbreak attempts, and policy violations in the raw user input."
homepage: https://raigo.ai/docs/openclaw
metadata:
  {
    "openclaw":
      {
        "emoji": "🛡️",
        "events": ["message:received"],
        "requires": { "bins": ["curl", "node"] },
      },
  }
---

# RAIGO Agent Firewall Hook

This hook screens every inbound message against your RAIGO policy **before the agent sees it**. It fires on the `message:received` event, which means it runs as early as possible in the message processing pipeline.

## What It Does

When a message arrives from any channel (WhatsApp, Telegram, Discord, etc.), this hook:

1. Calls the RAIGO Engine at `http://localhost:8181/v1/evaluate` with the message content
2. If the policy returns `DENY` (e.g., prompt injection detected), it pushes a warning message back to the user
3. If the policy returns `WARN`, it pushes a notice to the user
4. If the policy returns `ALLOW`, it does nothing and the message proceeds normally

**Important:** This hook is an **early warning layer**. Because OpenClaw's `message:received` event fires as an observer (not a gatekeeper), the hook cannot prevent the agent from receiving the message. The primary enforcement layer is the [RAIGO SKILL.md](../skill/raigo/SKILL.md), which instructs the agent to call RAIGO before executing actions.

## Architecture

```
Inbound Message
      │
      ▼
message:received event
      │
      ├──► raigo-af hook ──► RAIGO Engine ──► DENY ──► Push warning to user
      │                                   └──► ALLOW ──► (silent, continue)
      │
      ▼
Agent (Pi) processes message
      │
      ├──► RAIGO SKILL.md instructs agent to call engine before actions
      │
      ▼
Action executed (or blocked by skill)
```

## Installation

### 1. Install the hook

Copy the hook directory to your OpenClaw managed hooks directory:

```bash
# macOS / Linux
cp -r raigo-af ~/.openclaw/hooks/raigo-af

# Or install via npm (when published)
openclaw plugins install @periculo/raigo-openclaw-hook
```

### 2. Enable the hook

```bash
openclaw hooks enable raigo-af
```

### 3. Verify it is running

```bash
openclaw hooks list
openclaw hooks check
```

### 4. Start the RAIGO Engine

The hook requires the RAIGO Engine to be running:

```bash
raigo-engine ~/.openclaw/openclaw_af.raigo
```

## Requirements

- The RAIGO Engine must be running at `http://localhost:8181`
- `curl` must be available on PATH
- Node.js 18 or later

## Configuration

The hook reads its configuration from environment variables set in the OpenClaw hooks config:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "raigo-af": {
          "enabled": true,
          "env": {
            "RAIGO_ENGINE_URL": "http://localhost:8181",
            "RAIGO_FAIL_OPEN": "false"
          }
        }
      }
    }
  }
}
```

| Variable | Default | Description |
|---|---|---|
| `RAIGO_ENGINE_URL` | `http://localhost:8181` | URL of the RAIGO Engine |
| `RAIGO_FAIL_OPEN` | `false` | If `true`, allow messages when engine is unreachable. If `false`, warn user when engine is down. |

## More Information

- [RAIGO Documentation](https://raigo.ai/docs)
- [OpenClaw Hooks Documentation](https://docs.openclaw.ai/automation/hooks)
- [RAIGO SKILL.md](../skill/raigo/SKILL.md) — the primary enforcement layer
