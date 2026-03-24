<div align="center">

# RAIGO

**The open standard for AI agent governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/PericuloLimited/raigo/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![npm](https://img.shields.io/npm/v/@periculo/raigo.svg)](https://www.npmjs.com/package/@periculo/raigo)

[Documentation](https://raigo.periculo.co.uk) · [Specification](./SPECIFICATION.md) · [Architecture](./ARCHITECTURE.md) · [Examples](./examples/) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

RAIGO (Runtime AI Governance Object) is an open-source standard for defining AI agent policies as code. It solves a structural problem in the AI ecosystem: every tool — Claude, ChatGPT, n8n, OpenClaw, Microsoft Copilot — requires a completely different format for governance rules. RAIGO is the single source of truth that compiles to all of them.

**Write your policies once. Compile to every AI tool your organization uses.**

---

## What RAIGO Is (and Is Not)

RAIGO is a **policy format standard and an intelligent compiler**. It is not (yet) a runtime server you need to deploy. This is a deliberate design choice.

Most AI tools today cannot make external API calls to a central policy engine before generating a response. They rely on system prompts, custom instructions, and JSON schemas. RAIGO meets them where they are: you run the compiler once, and it generates the exact native artifact each platform needs to enforce your policies using its own internal mechanisms.

This means there is no infrastructure to manage, no server to run, and no latency to introduce. A developer can go from zero to governed AI agents in under five minutes.

For organizations that need deterministic, WAF-like enforcement that does not rely on the AI model's cooperation, the [RAIGO Runtime Interceptor](./ROADMAP.md) is on the roadmap for 2026.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full explanation of the v1 compiler model vs. the planned v2 runtime engine.

---

## How the Compiler Works

The intelligence of RAIGO lives in the compiler. A `.raigo` file is a structured YAML document that captures your governance intent in a platform-agnostic way. The compiler's job is to translate that intent into the precise, idiomatic format that each AI platform understands and enforces.

This is not a simple text substitution. For each target, the compiler:

1. **Reads the policy schema** — parsing conditions, actions, severity levels, compliance mappings, and platform overrides.
2. **Generates native enforcement artifacts** — not just the rules, but the runtime handler instructions that tell the platform *how* to enforce them: what to say when a rule fires, how to structure the refusal, and what to log.
3. **Embeds violation response objects** — structured error payloads (with HTTP status codes, user messages, developer messages, and audit fields) that developers can catch and handle programmatically.

The result is that a single `DENY` rule in a `.raigo` file becomes a hard constraint in OpenClaw's JSON schema, a `<policy_enforcement>` block in Claude's XML system prompt, and a `violation_response` object in n8n's JSON — each formatted correctly for the platform, with no manual translation required.

```yaml
# policy.raigo — the single source of truth
metadata:
  organisation: "Acme Healthcare Trust"
  policy_suite: "HIPAA AI Governance Baseline"
  version: "1.0.0"

policies:
  - id: "DP-01"
    domain: "Data Privacy"
    title: "Block PHI transmission to external systems"
    condition:
      trigger: "output_contains"
      data_classification: ["PHI", "PII"]
    action: "DENY"
    severity: "critical"
    directive: "Never transmit protected health information outside approved internal systems."
    enforcement_message: "BLOCKED [DP-01]: PHI transmission is prohibited under HIPAA §164.502."
    compliance_mapping:
      - framework: "HIPAA"
        control: "§164.502"
        description: "Uses and disclosures of protected health information"
    audit_required: true
```

Run the compiler and RAIGO generates platform-specific outputs for all your tools simultaneously:

```bash
raigo compile policy.raigo --all
```

---

## Compilation Targets

RAIGO currently compiles to **9 native targets**. Each output is a complete, ready-to-use artifact — not a template.

| Target | Output Format | How It Is Used |
|---|---|---|
| `claude` | XML System Prompt | Paste into the `system` parameter of the Claude API, or into Claude.ai project instructions |
| `chatgpt` | Markdown Instructions | Paste into ChatGPT Custom Instructions, or the `system` message of the Assistants API |
| `n8n` | JSON System Prompt | Load as a Global Variable in n8n; reference in AI Agent node system prompts |
| `openclaw` | JSON Constraint Schema | Place in your OpenClaw project directory; enforced natively by the OpenClaw gateway |
| `lovable` | Markdown Knowledge Block | Add to Lovable Workspace Knowledge; applied to all AI interactions in the workspace |
| `gemini` | JSON System Instruction | Pass as the `system_instruction` field in the Vertex AI / Gemini API |
| `perplexity` | Markdown System Prompt | Add to Perplexity Spaces custom instructions |
| `copilot` | JSON Policy Object | Add to Microsoft Copilot Studio declarative agent manifest |
| `audit` | Markdown Summary | Human-readable compliance evidence for auditors |

---

## Quick Start

### Using the CLI

```bash
# Install globally
npm install -g @periculo/raigo

# Initialise a new policy file in the current directory
raigo init

# Validate your policy file against the schema
raigo validate policy.raigo

# List all available compilation targets
raigo targets

# Compile for a specific target
raigo compile policy.raigo --target openclaw

# Compile for all targets at once (outputs to ./raigo-compiled/)
raigo compile policy.raigo --all
```

### Using the Web Generator

Visit [raigo.periculo.co.uk](https://raigo.periculo.co.uk), paste your corporate policy in plain English, and download your compiled `.raigo` file and all platform outputs instantly. The web generator uses an LLM to parse your natural language policy and structure it into a valid `.raigo` file.

---

## Integrating RAIGO into Your Application

RAIGO is designed to be embedded into other tools and platforms. If you are building an AI tool, agent framework, or workflow platform, you can add native RAIGO support so your users can govern it with a `.raigo` file.

**What "native RAIGO support" means for your platform:**

1. Your platform reads the compiled RAIGO output for its target (e.g., `openclaw_policy.json`).
2. Your platform enforces the rules in that output using its own internal mechanisms.
3. When a rule fires, your platform returns the structured `violation_response` object from the compiled output.

There is no RAIGO SDK to install, no RAIGO server to call, and no runtime dependency. The compiled output is a static artifact that your platform reads once at startup (or on each request, if you hot-reload policies).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed walkthrough of the integration model, and the [Compiler source](./cli/src/compiler.ts) to understand exactly what each target output contains.

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
| Governance relies on the AI model's cooperation | Roadmap: runtime interceptor for deterministic enforcement |

---

## The `.raigo` Format

The `.raigo` format is a YAML-based, declarative policy definition language. It is designed to be human-readable (policy authors do not need to be engineers), machine-parseable (the compiler validates and transforms it reliably), version-controllable (policies live in your repository, not in a SaaS dashboard), and auditable (every change is tracked by your existing version control system).

See the full [`.raigo` Format Specification](./SPECIFICATION.md) for the complete schema reference, all supported fields, condition triggers, compliance framework mappings, and advanced usage.

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

RAIGO is designed to be the policy layer for the entire AI agent ecosystem.

| Tool | Status | Description |
|---|---|---|
| RAIGO CLI | **Available** | Compile, validate, and initialize `.raigo` files from the command line |
| RAIGO Web Generator | **Available** | Web-based compiler with LLM-powered natural language ingestion |
| VS Code Extension | Planned | Syntax highlighting, linting, and live compilation preview |
| GitHub Action | Planned | Validate `.raigo` files in CI/CD pipelines on every commit |
| Policy Registry | Planned | Public registry for sharing community-contributed policies |
| Runtime Interceptor | Planned | WAF-like proxy for deterministic, runtime policy enforcement |

---

## Production Adopters

Does your organization use RAIGO in production? Please submit a pull request to add yourself to [ADOPTERS.md](./ADOPTERS.md).

---

## Contributing

RAIGO is an open standard and we welcome contributions of all kinds — from improving the specification and adding new compiler targets, to contributing example policies for new compliance frameworks and industries.

Please read the [Contributing Guide](./CONTRIBUTING.md) to learn how to make your first contribution. Review our [Governance Model](./GOVERNANCE.md) to understand how decisions are made. Check the [Roadmap](./ROADMAP.md) to see where the project is headed.

---

## Security

Please report vulnerabilities by email to **security@periculo.co.uk**. For full details, see our [Security Policy](./SECURITY.md).

---

## Enterprise

Managing `.raigo` files across dozens of repositories and AI tools? The **Periculo Enterprise Control Plane** provides centralised policy management, automatic sync to connected tools, fleet-wide enforcement, and a full audit trail.

[Book a free 15-minute AI Governance Review →](https://periculo.co.uk/book)

---

## License

MIT © [Periculo Security](https://periculo.co.uk)

RAIGO is developed and maintained by [Periculo Security](https://periculo.co.uk), a cybersecurity company specialising in AI governance for defence and healthcare sectors.
