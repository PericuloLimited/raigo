<div align="center">

# raigo

**The open standard for AI agent governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.3.0-orange.svg)](https://github.com/PericuloLimited/raigo/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![npm](https://img.shields.io/npm/v/@periculo/raigo.svg)](https://www.npmjs.com/package/@periculo/raigo)
[![Live Demo](https://img.shields.io/badge/live%20demo-cloud.raigo.ai%2Fdemo-orange)](https://cloud.raigo.ai/demo)

[Specification](./SPECIFICATION.md) · [Documentation](#documentation) · [Examples](./examples/) · [Architecture](./ARCHITECTURE.md) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What raigo Is

**raigo is an open standard.** The core of this repository is the `.raigo` file format — a YAML-based, declarative policy definition language for AI governance. It is the single source of truth for an organisation's AI usage rules: what is allowed, what is blocked, what must be logged, and which compliance frameworks apply.

The `.raigo` format is the open-source contribution. It is free to use, implement, extend, and build on. Anyone can write a `.raigo` file, build a compiler that reads it, or build an engine that enforces it. The format is not tied to any vendor, platform, or cloud product.

Everything else in this repository — the reference compiler CLI, the self-hosted engine, and the [raigo cloud](https://cloud.raigo.ai) managed service — are implementations built on top of the standard. They are provided as reference implementations and tools to make adopting the standard easier, but they are not the standard itself.

> **The `.raigo` format is to AI governance what OpenAPI is to REST APIs, or what Rego is to policy-as-code: a vendor-neutral, open specification that any tool can implement.**

---

## The Standard: The `.raigo` File Format

A `.raigo` file is a YAML document. It has three sections: `metadata` (who owns the policy, compliance context), `context` (the environment: tools, data classifications, networks), and `policies` (the rules: atomic, one directive per rule, deterministic action).

```yaml
raigo_version: "0.3.0"

metadata:
  organisation: "Acme Healthcare Trust"
  policy_suite: "HIPAA AI Governance Baseline"
  version: "1.0.0"
  effective_date: "2026-03-01"
  owner: "Information Security Team"

context:
  data_classifications:
    - id: "PHI"
      description: "Protected Health Information"
    - id: "PII"
      description: "Personally Identifiable Information"

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
    audit_required: true
```

The full format specification is in [SPECIFICATION.md](./SPECIFICATION.md). It defines every field, every enum value, every required and optional property, and the versioning rules for the format itself. If you are building a tool that reads or enforces `.raigo` files, the specification is your contract.

---

## How It Works

A `.raigo` file can be used in two ways, depending on your deployment model.

**Compiler mode** — for tools that cannot call an external engine (ChatGPT, Claude.ai, n8n, Lovable, GitHub Copilot). The raigo compiler reads the `.raigo` file and generates a native enforcement artifact for the target platform: a system prompt, a JSON config, a Markdown knowledge block. The AI platform enforces the policy using its own native mechanisms.

**Engine mode** — for applications that can make HTTP calls. The raigo engine runs as a lightweight service. Before a prompt reaches the LLM, your application calls `POST /v1/evaluate`. The engine evaluates the prompt against the active policy and returns a deterministic `ALLOW`, `DENY`, or `WARN` decision. Nothing reaches the LLM until the engine approves it.

```
Your Application
      │
      ▼
┌─────────────┐         ┌──────────────┐
│ raigo engine│─ ALLOW ─▶   LLM API   │
│  (policy.   │         │ (OpenAI,     │
│   raigo)    │─ DENY  ─▶  Anthropic, │
└─────────────┘   │      │  etc.)      │
                  │      └──────────────┘
                  ▼
         Violation Response
         (action, policyMessage,
          matchedRules, auditLog)
```

The key difference from system prompts is that enforcement in engine mode is **deterministic**. A `DENY` rule cannot be overridden by prompt injection, model drift, or a creative user. The engine blocks the request before the LLM ever sees it.

---

## Deployment Models

The same `.raigo` policy file works across all four deployment models without modification.

| Model | How It Runs | Best For |
|---|---|---|
| **Compiler** | CLI tool, zero infrastructure | ChatGPT, Claude.ai, n8n, Lovable — tools that cannot call an external engine |
| **Local / Sidecar** | Binary or container alongside your app | Custom agents, OpenClaw, local LLMs (Ollama, vLLM) |
| **Self-Hosted Engine** | Centralized service in your own infrastructure | Enterprises, defence contractors, healthcare providers |
| **raigo cloud** | Managed SaaS, no infrastructure | Teams who want governance without ops overhead |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full technical walkthrough of each model.

---

## Compilation Targets

When running in compiler mode, raigo generates native enforcement artifacts for each target platform. Each output includes runtime handler instructions telling the platform how to enforce the policy.

| Target | Output Format | Platform |
|---|---|---|
| `claude` | XML System Prompt | Claude API `system` parameter |
| `chatgpt` | Markdown Instructions | ChatGPT Custom Instructions / Assistants API |
| `n8n` | JSON System Prompt | n8n AI Agent node global variable |
| `openclaw` | JSON Constraint Schema | OpenClaw gateway config |
| `lovable` | Markdown Knowledge Block | Lovable Workspace Knowledge |
| `gemini` | JSON System Instruction | Vertex AI `system_instruction` field |
| `perplexity` | Markdown System Prompt | Perplexity Spaces custom instructions |
| `copilot` | JSON Policy Object | Microsoft Copilot Studio declarative agent manifest |
| `audit` | Markdown Summary | Human-readable compliance evidence for auditors |

```bash
# Install the compiler
npm install -g @periculo/raigo

# Compile for a specific platform
raigo compile policy.raigo --target claude
raigo compile policy.raigo --target n8n

# Compile for all platforms at once
raigo compile policy.raigo --all

# Validate a policy file against the spec
raigo validate policy.raigo

# Initialise a new policy from a template
raigo init
```

---

## Observe Mode (Warn-First Onboarding)

When you first deploy the raigo engine, it starts in **Observe mode** by default. In this mode, all `DENY` rules are downgraded to `WARN` — nothing is blocked, but every policy match is logged. This lets you see exactly what your rules would have blocked across your real traffic before committing to enforcement.

Once you are confident your rules are correct, switch to **Enforce mode** — at which point `DENY` rules become active.

```bash
# Start in observe mode (default)
RAIGO_ENGINE_MODE=observe raigo serve --policy master.raigo

# Switch to enforce when ready
RAIGO_ENGINE_MODE=enforce raigo serve --policy master.raigo
```

See [docs/observe-mode.md](./docs/observe-mode.md) for the full specification, including the `observeOverride` response flag and recommended onboarding workflow.

---

## Documentation

| Document | Description |
|---|---|
| [Specification](./SPECIFICATION.md) | The `.raigo` format specification — the open standard |
| [Quickstart](./docs/quickstart.md) | Run the engine locally, self-host, or use raigo cloud |
| [Observe Mode](./docs/observe-mode.md) | Warn-first onboarding: see what would be blocked before enforcing |
| [Testing Framework](./docs/testing-framework.md) | `raigo test` CLI, YAML test cases, CI/CD integration |
| [Compliance Mappings](./docs/compliance-mappings.md) | EU AI Act, DORA, HIPAA, ISO 42001, NIST AI RMF, GDPR, SOC 2 |
| [Webhook Schema](./docs/webhook-schema.md) | Stable JSON schemas for evaluate request/response and webhook events |
| [Conflict Resolution](./docs/conflict-resolution.md) | Most-restrictive-wins algorithm, priority override, worked examples |
| [Architecture](./ARCHITECTURE.md) | Full technical walkthrough of all four deployment models |

---

## Examples

| Example | Compliance Framework | Description |
|---|---|---|
| [`healthcare.raigo`](./examples/healthcare.raigo) | HIPAA | Policies for healthcare AI agents handling patient data |
| [`defence.raigo`](./examples/defence.raigo) | CMMC | Policies for defence contractors and classified information handling |
| [`startup.raigo`](./examples/startup.raigo) | General | Sensible defaults for early-stage teams |

---

## Implementing the Standard

If you are building an AI tool, agent framework, or workflow platform, you can add native raigo support so your users can govern it with a `.raigo` file.

**Option 1 — Engine integration.** Configure your platform to call the raigo engine API (`POST /v1/evaluate`) before executing AI actions. Your platform passes the proposed prompt to raigo and receives a deterministic `ALLOW`/`DENY`/`WARN` decision. This is the recommended approach for any platform that can make HTTP calls.

**Option 2 — Compiler integration.** Add a raigo compilation target for your platform's native policy format. When users run `raigo compile policy.raigo --target yourplatform`, raigo generates the correct artifact for your platform to load and enforce natively.

**Option 3 — Native `.raigo` parser.** Implement the [SPECIFICATION.md](./SPECIFICATION.md) directly in your platform. Read `.raigo` files natively and enforce rules without the raigo CLI or engine as a dependency.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed integration guide.

---

## Ecosystem

| Tool | Status | Description |
|---|---|---|
| raigo CLI | **Available** | Compile, validate, and initialise `.raigo` files |
| raigo engine (local) | **Available** | Lightweight service for local/sidecar deployment |
| raigo cloud | **Available** | Managed SaaS policy evaluation — [cloud.raigo.ai](https://cloud.raigo.ai) · [**Try live demo →**](https://cloud.raigo.ai/demo) |
| VS Code extension | Planned | Syntax highlighting, linting, live compilation |
| GitHub Action | Planned | Validate `.raigo` files in CI/CD pipelines |
| Policy registry | Planned | Public registry for sharing community policies |

---

## Production Adopters

Does your organisation use raigo in production? Please submit a pull request to add yourself to [ADOPTERS.md](./ADOPTERS.md).

---

## Contributing

raigo is an open standard and we welcome contributions of all kinds — to the format specification, the reference compiler, the engine, the docs, and the examples. Please read the [Contributing Guide](./CONTRIBUTING.md), review our [Governance Model](./GOVERNANCE.md), and check the [Roadmap](./ROADMAP.md).

The most impactful contributions are to the **specification itself**: new field definitions, new compliance framework mappings, new condition trigger types, and new compilation targets. If you are implementing raigo in a new platform or tool, please open an issue so we can link to your implementation.

---

## Security

Please report vulnerabilities to **security@periculo.co.uk**. See our [Security Policy](./SECURITY.md).

---

## Enterprise

The **Periculo Enterprise Control Plane** provides centralised policy management, automatic sync to connected tools, fleet-wide enforcement, and a full audit trail across all deployment models.

[Book a free 30-minute AI Security Strategy Call →](https://meetings-eu1.hubspot.com/harrison-mussell/30-min-strategy-call)

---

## License

MIT © [Periculo Security](https://periculo.co.uk)

raigo is developed and maintained by [Periculo Security](https://periculo.co.uk), a cybersecurity company specialising in AI governance for defence and healthcare sectors.
