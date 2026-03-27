# @periculo/openclaw-plugin-raigo

> raigo AI governance enforcement for OpenClaw — `before_tool_call` policy firewall

[![npm version](https://img.shields.io/npm/v/@periculo/openclaw-plugin-raigo)](https://www.npmjs.com/package/@periculo/openclaw-plugin-raigo)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-raigo-5865F2?logo=discord)](https://discord.gg/8VDgbrju)

This plugin registers a `before_tool_call` hook in OpenClaw. Before every `exec`, `browser`, `write`, or `message` call, it posts the action to your raigo engine. A **DENY** blocks the tool call entirely — the agent never executes it. A **WARN** lets it through with a warning appended to agent context. Every decision is logged to your raigo violation log.

---

## How it works

```
Agent → OpenClaw → before_tool_call hook
                        ↓
                   POST /v1/evaluate
                        ↓
                   raigo engine
                        ↓
              ALLOW / WARN / DENY
                        ↓
         Tool executes / Warning / Blocked
```

---

## Installation

```bash
openClaw plugins install @periculo/openclaw-plugin-raigo
```

Or install the SKILL.md for compiled rule enforcement (no engine required):

```bash
openClaw skills install raigo-af
```

---

## Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "raigo": {
        "enabled": true,
        "config": {
          "engineUrl": "https://cloud.raigo.ai/v1",
          "apiKey": "rgo_live_YOUR_KEY_HERE"
        }
      }
    }
  }
}
```

Get your API key from [raigo cloud](https://cloud.raigo.ai) → Connect → API Keys.

---

## Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `engineUrl` | `string` | — | **Required.** raigo engine base URL (e.g. `https://cloud.raigo.ai/v1`) |
| `apiKey` | `string` | — | **Required.** Bearer token from your raigo cloud API Keys page |
| `timeoutMs` | `number` | `3000` | Request timeout in milliseconds |
| `verbose` | `boolean` | `false` | Log all ALLOW decisions to console |
| `failOpen` | `boolean` | `true` | Allow tool calls when engine is unreachable |

---

## Request format

The plugin sends this to your engine on every tool call:

```http
POST /v1/evaluate
Authorization: Bearer rgo_live_...
Content-Type: application/json

{
  "prompt": "Tool call: exec\nInput: rm -rf /var/data",
  "context": {
    "tool": "openclaw",
    "tool_name": "exec",
    "channel": "whatsapp",
    "agent_id": "agent-42"
  }
}
```

## Response format

```json
{
  "action": "DENY",
  "message": "Blocked [AF-03]: Destructive action requires explicit confirmation.",
  "ruleId": "AF-03",
  "ruleName": "Destructive Command Guard",
  "severity": "high",
  "complianceRefs": ["SOC2-CC6.1"],
  "processingMs": 8
}
```

---

## Programmatic usage

```typescript
import { createRaigoPlugin } from "@periculo/openclaw-plugin-raigo";

const plugin = createRaigoPlugin({
  engineUrl: "https://cloud.raigo.ai/v1",
  apiKey: "rgo_live_...",
  failOpen: true,
  verbose: false,
});

// Use directly in your OpenClaw config
export default plugin;
```

---

## Links

- [raigo documentation](https://raigo.ai/docs/openclaw)
- [raigo cloud](https://cloud.raigo.ai)
- [raigo OSS repo](https://github.com/PericuloLimited/raigo)
- [Discord community](https://discord.gg/8VDgbrju)
- [Report an issue](https://github.com/PericuloLimited/raigo/issues)
