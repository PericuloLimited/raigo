<div align="center">

# RAIGO

**The open standard for AI agent governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/PericuloLimited/raigo/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![CI](https://github.com/PericuloLimited/raigo/actions/workflows/ci.yml/badge.svg)](https://github.com/PericuloLimited/raigo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@periculo/raigo.svg)](https://www.npmjs.com/package/@periculo/raigo)

[Documentation](https://raigo.periculo.co.uk) · [Specification](./SPECIFICATION.md) · [Examples](./examples/) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

RAIGO (Runtime AI Governance Object) is an open-source, general-purpose policy standard and compiler for AI agents. It enables unified, context-aware policy enforcement across the entire AI stack — from chat interfaces to autonomous agents and workflow automation platforms.

You write your governance rules once in a single, human-readable `.raigo` file. RAIGO compiles it into the exact, optimized format required by every AI tool your organization uses.

**One file. Every agent. Every tool. Every platform.**

---

## How Does RAIGO Work?

RAIGO gives you a high-level declarative language to author and enforce policies across your AI stack. With RAIGO, you define _rules_ that govern how your AI systems should behave. These rules exist to answer questions like:

- Can this agent process personally identifiable information (PII) or protected health information (PHI)?
- What topics must this agent refuse to engage with?
- What compliance frameworks (e.g., HIPAA, CMMC, GDPR) must this agent adhere to?

You integrate your AI tools with RAIGO so that these policy decisions do not have to be hardcoded in system prompts or scattered across different platforms. The RAIGO compiler takes your single `.raigo` file and generates the exact, optimized format required by each specific AI platform — complete with runtime handler instructions that tell the AI *how* to enforce the policy at runtime.

```yaml
# policy.raigo
version: "1.0"
organization: "Acme Healthcare"
compliance_frameworks:
  - "HIPAA"

policies:
  - id: "DP-01"
    domain: "Data Privacy"
    condition: "If handling patient data"
    action: "DENY"
    severity: "critical"
    directives:
      - "Never process, store, or transmit real patient data."
      - "Do not send PHI to any external API or service."
      - "Reject any input that appears to contain patient identifiers."
    enforcement_message: "Blocked by policy DP-01 (HIPAA compliance)."
```

Run the compiler and RAIGO generates platform-specific outputs for all your tools simultaneously:

```bash
raigo compile policy.raigo --all
```

---

## Compilation Targets

RAIGO currently compiles to **9 native targets**:

| Target | Output Format | Use Case |
|---|---|---|
| `claude` | XML System Prompt | Anthropic Claude API & Claude.ai |
| `chatgpt` | Markdown Instructions | ChatGPT Custom Instructions & API |
| `n8n` | JSON System Prompt | n8n AI Agent nodes |
| `openclaw` | JSON Constraint Schema | OpenClaw hard constraints |
| `lovable` | Markdown Knowledge Block | Lovable workspace AI |
| `gemini` | JSON System Instruction | Google Gemini API |
| `perplexity` | Markdown System Prompt | Perplexity AI |
| `copilot` | JSON Policy Object | Microsoft Copilot Studio |
| `audit` | Markdown Summary | Compliance audit trails |

Each compiled output includes **runtime handler instructions** — not just the policy rules, but explicit instructions telling the AI platform *how* to enforce them, what to say when a policy is triggered, and how to log violations.

---

## Quick Start

### Using the Web Generator (No Code)

Visit [raigo.periculo.co.uk](https://raigo.periculo.co.uk), paste your corporate policy in plain English, and download your compiled `.raigo` file and all platform outputs instantly.

### Using the CLI

```bash
# Install globally
npm install -g @periculo/raigo

# Initialise a new policy file
raigo init

# Validate your policy file
raigo validate policy.raigo

# List all available compilation targets
raigo targets

# Compile for a specific target
raigo compile policy.raigo --target openclaw
raigo compile policy.raigo --target chatgpt

# Compile for all targets at once
raigo compile policy.raigo --all
```

---

## Why RAIGO?

The AI governance problem is structural, not cosmetic. System prompts are suggestions — they can be overridden, forgotten, or simply ignored by the model. Policies stored in Word documents or wikis are invisible to the AI tools they are meant to govern. And as organizations adopt more AI tools, the problem compounds: each platform has a different format, a different enforcement model, and a different way of expressing constraints.

RAIGO treats AI governance as an engineering problem, not a documentation problem.

| The Problem | The RAIGO Solution |
|---|---|
| System prompts are suggestions, not enforceable rules | Declarative policies compiled into platform-native enforcement formats |
| Every AI tool requires a different policy format | One `.raigo` file compiles to all targets simultaneously |
| Policies live in people's heads or Word documents | Machine-readable, version-controlled, auditable policy-as-code |
| No standard way to govern AI agents across an organization | An open standard, like `robots.txt` or `.htaccess` for AI |
| Compliance evidence is manual and fragile | Automated audit summaries generated on every compile |

---

## The `.raigo` Format

The `.raigo` format is a YAML-based, declarative policy definition language. It is designed to be:

- **Human-readable:** Policy authors do not need to be engineers.
- **Machine-parseable:** The compiler can validate and transform it reliably.
- **Version-controllable:** Policies live in your repository, not in a SaaS dashboard.
- **Auditable:** Every change is tracked by your existing version control system.

See the full [`.raigo` Format Specification](./SPECIFICATION.md) for the complete schema reference, all supported fields, and advanced usage including policy inheritance and severity levels.

---

## Examples

The [`/examples`](./examples/) directory contains ready-to-use `.raigo` files for common use cases:

| Example | Compliance Framework | Description |
|---|---|---|
| [`healthcare.raigo`](./examples/healthcare.raigo) | HIPAA | Policies for healthcare AI agents handling patient data |
| [`defence.raigo`](./examples/defence.raigo) | CMMC | Policies for defence contractors and classified information handling |
| [`startup.raigo`](./examples/startup.raigo) | General | Sensible defaults for early-stage teams |

---

## Ecosystem

RAIGO is designed to be the policy layer for the entire AI agent ecosystem. We are actively working with the community to build integrations and tooling.

| Tool | Status | Description |
|---|---|---|
| RAIGO CLI | **Available** | Compile, validate, and initialize `.raigo` files |
| RAIGO Web Generator | **Available** | Web-based compiler at raigo.periculo.co.uk |
| VS Code Extension | Planned | Syntax highlighting, linting, and live compilation |
| GitHub Action | Planned | Validate `.raigo` files in CI/CD pipelines |
| Policy Registry | Planned | Public registry for sharing community policies |
| Runtime Interceptor | Planned | WAF-like engine for real-time policy enforcement |

---

## Production Adopters

Does your organization use RAIGO in production? Please submit a pull request to add yourself to [ADOPTERS.md](./ADOPTERS.md). This is one of the most valuable contributions you can make to the project.

---

## Contributing

RAIGO is an open standard and we welcome contributions of all kinds — from improving the specification and adding new compiler targets, to contributing example policies for new compliance frameworks and industries.

Please read the [Contributing Guide](./CONTRIBUTING.md) to learn how to make your first contribution. Review our [Governance Model](./GOVERNANCE.md) to understand how decisions are made. Check the [Roadmap](./ROADMAP.md) to see where the project is headed.

---

## Security

Please report vulnerabilities by email to **security@periculo.co.uk**. We will send a confirmation message to acknowledge receipt and follow up once the issue has been investigated. For full details, see our [Security Policy](./SECURITY.md).

---

## Enterprise

Managing `.raigo` files across dozens of repositories and AI tools? The **Periculo Enterprise Control Plane** provides centralised policy management, automatic sync to connected tools, fleet-wide enforcement, and a full audit trail.

[Book a free 15-minute AI Governance Review →](https://periculo.co.uk/book)

---

## License

MIT © [Periculo Security](https://periculo.co.uk)

RAIGO is developed and maintained by [Periculo Security](https://periculo.co.uk), a cybersecurity company specialising in AI governance for defence and healthcare sectors.
