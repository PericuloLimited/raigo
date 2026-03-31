# @raigo/mcp-server

**RAIGO MCP Server** — AI policy enforcement for any MCP-compatible agent.

Connect your [raigo Cloud](https://cloud.raigo.ai) policy engine to Claude Desktop, Cursor, Windsurf, Hermes, or any other agent that supports the [Model Context Protocol](https://modelcontextprotocol.io). Once connected, your agent will call your organisation's raigo policy before every sensitive action — automatically, without any code changes.

---

## Tools

| Tool | Description |
|------|-------------|
| `raigo_evaluate` | Evaluate a prompt or proposed action against your policy. Returns `ALLOW`, `DENY`, or `WARN` with the matching rule, severity, and policy message. |
| `raigo_check_balance` | Check your raigo Cloud credit balance. Each `raigo_evaluate` call deducts 1 credit. |

---

## Quick Start

### 1. Get your API key

1. Sign up at [cloud.raigo.ai](https://cloud.raigo.ai)
2. Go to **Integrations** → select your agent tool
3. Click **Generate & Download** — your pre-configured setup is ready

Or generate a key manually: **Settings → API Keys → New Key**.

### 2. Install the server

```bash
npm install -g @raigo/mcp-server
# or run directly without installing:
npx @raigo/mcp-server
```

### 3. Configure your agent

See the client-specific instructions below.

---

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "raigo": {
      "command": "npx",
      "args": ["-y", "@raigo/mcp-server"],
      "env": {
        "RAIGO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You will see **raigo** appear in the MCP tools panel.

---

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "raigo": {
      "command": "npx",
      "args": ["-y", "@raigo/mcp-server"],
      "env": {
        "RAIGO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Or add via **Cursor Settings → MCP → Add Server**.

---

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "raigo": {
      "command": "npx",
      "args": ["-y", "@raigo/mcp-server"],
      "env": {
        "RAIGO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

### Hermes Agent

Add to `~/.hermes/config.yaml`:

```yaml
mcp:
  servers:
    - name: raigo
      command: npx
      args: ["-y", "@raigo/mcp-server"]
      env:
        RAIGO_API_KEY: "your_api_key_here"
```

---

### Generic MCP Client (stdio)

```bash
RAIGO_API_KEY=your_api_key_here npx @raigo/mcp-server
```

The server communicates over stdio using the MCP protocol. Point any MCP-compatible client at this command.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RAIGO_API_KEY` | **Yes** | — | Your raigo Cloud API key |
| `RAIGO_ENDPOINT` | No | `https://cloud.raigo.ai/v1/evaluate` | Override the evaluate endpoint (e.g. for self-hosted engine) |
| `RAIGO_BALANCE_ENDPOINT` | No | `https://cloud.raigo.ai/v1/balance` | Override the balance endpoint |

---

## Self-Hosted Engine

If you are running the raigo engine locally (see [`../../engine/`](../../engine/)), point the server at your local instance:

```json
{
  "env": {
    "RAIGO_API_KEY": "your_api_key_here",
    "RAIGO_ENDPOINT": "http://localhost:4000/v1/evaluate",
    "RAIGO_BALANCE_ENDPOINT": "http://localhost:4000/v1/balance"
  }
}
```

---

## How It Works

```
Your Agent (Claude / Cursor / Windsurf / Hermes)
        │
        │  MCP tool call: raigo_evaluate({ prompt: "..." })
        ▼
  @raigo/mcp-server  (stdio)
        │
        │  POST /v1/evaluate  { prompt, context }
        │  Authorization: Bearer <RAIGO_API_KEY>
        ▼
  raigo Cloud  (or self-hosted engine)
        │
        │  { action: "ALLOW" | "DENY" | "WARN", ruleId, policyMessage, ... }
        ▼
  @raigo/mcp-server
        │
        │  Formatted result returned to agent
        ▼
  Your Agent acts on the result:
    ALLOW → proceed
    DENY  → stop, surface policyMessage to user
    WARN  → pause, ask user for explicit confirmation
```

---

## Evaluate Tool — Example Responses

**ALLOW**
```
✅ RAIGO: ALLOW

This action is permitted by your organisation's policy.
Credits remaining: 4,823
```

**DENY**
```
🛡️ RAIGO: DENY

Rule: AF-06 — Credential and Secret Transmission
Severity: CRITICAL
Policy: Credentials must not be transmitted via messaging platforms.
Message: I cannot send this API key via Slack. Please use a secrets manager instead.

This action is blocked by your organisation's policy. Do not proceed.
```

**WARN**
```
⚠️ RAIGO: WARN

Rule: AF-11 — Financial Transaction Authorisation
Severity: HIGH
Policy: Financial transactions require explicit human confirmation.
Message: This action will transfer £500. Please confirm the recipient and amount before proceeding.

This action requires explicit human confirmation before proceeding.
```

---

## Credits

Each call to `raigo_evaluate` deducts **1 credit** from your raigo Cloud balance.

| Package | Credits | Price |
|---------|---------|-------|
| Starter | 1,000 | £10 |
| Growth | 2,750 | £25 |
| Scale | 6,000 | £50 |
| Enterprise | 15,000 | £100 |

Top up at [cloud.raigo.ai/billing](https://cloud.raigo.ai/billing). New accounts receive **500 free credits**.

---

## Development

```bash
# Clone the repo
git clone https://github.com/PericuloLimited/raigo.git
cd raigo/integrations/mcp

# Install dependencies
npm install

# Build
npm run build

# Run locally
RAIGO_API_KEY=your_key npm start

# Watch mode
npm run dev
```

---

## Links

- [raigo Cloud](https://cloud.raigo.ai)
- [raigo Documentation](https://raigo.ai/docs)
- [RAIGO Open Source](https://github.com/PericuloLimited/raigo)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Report an Issue](https://github.com/PericuloLimited/raigo/issues)
