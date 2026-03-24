# RAIGO by Periculo

**The declarative standard for AI agent governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/periculo/raigo)

---

> Stop letting your AI agents run on vibes. Give them a `.raigo` file.

---

## What is RAIGO?

RAIGO (Runtime AI Governance Object) is an open standard for defining organisational AI policies as code. You write your rules once in a single `policy.raigo` file. RAIGO compiles it into the exact format required by every AI tool your team uses.

**One file. Every agent. Every tool. Every platform.**

```yaml
# policy.raigo
version: "1.0"
organization: "Acme Corp"

policies:
  - id: "DP-01"
    domain: "Data Privacy"
    condition: "If handling user data"
    action: "DENY"
    directives:
      - "Never send PII to external APIs."
      - "Do not process real patient data."
    enforcement_message: "Blocked by policy DP-01."
```

---

## Why RAIGO?

| The Problem | The RAIGO Solution |
|---|---|
| System prompts are suggestions, not rules | Declarative policies that agents are forced to obey |
| Every AI tool needs a different format | One `.raigo` file compiles to all targets |
| Policies live in people's heads or Word docs | Machine-readable, version-controlled, auditable |
| No standard way to govern AI agents | An open standard, like `robots.txt` for AI |

---

## Compilation Targets

A single `policy.raigo` file compiles into:

- **Lovable** — Workspace Knowledge block (Markdown)
- **n8n** — AI Agent system prompt (JSON)
- **OpenClaw** — Hard constraint skill (`.openclaw/policy.json`)
- **ChatGPT** — Custom Instructions block (plain text)

---

## Quick Start

### Using the Web Generator (No Code)
Visit [raigo.periculo.com](https://raigo.periculo.com), paste your corporate policy, and download your compiled `.raigo` file instantly.

### Using the CLI
```bash
# Install
npm install -g @periculo/raigo-cli

# Initialise a new policy file
raigo init

# Compile for a specific target
raigo compile policy.raigo --target openclaw
raigo compile policy.raigo --target lovable
raigo compile policy.raigo --target n8n
raigo compile policy.raigo --target chatgpt

# Compile for all targets at once
raigo compile policy.raigo --all
```

---

## File Format

See the full [`.raigo` Format Specification](./SPECIFICATION.md) for the complete schema reference, all supported fields, and advanced usage.

---

## Examples

The [`/examples`](./examples/) directory contains ready-to-use `.raigo` files for common use cases:

- [`healthcare.raigo`](./examples/healthcare.raigo) — HIPAA-aligned policies for healthcare AI agents
- [`defence.raigo`](./examples/defence.raigo) — CMMC-aligned policies for defence contractors
- [`startup.raigo`](./examples/startup.raigo) — Sensible defaults for early-stage teams

---

## Contributing

RAIGO is an open standard. Contributions to the schema, the compiler, and the examples are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before submitting a pull request.

---

## Enterprise

Managing `.raigo` files across dozens of repositories and AI tools? **Periculo Enterprise Control Plane** provides centralised policy management, automatic sync to connected tools, and a full audit trail.

[Book a free 15-minute AI Governance Review →](https://periculo.com/book)

---

## License

MIT © [Periculo Security](https://periculo.com)
