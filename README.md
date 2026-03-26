<div align="center">

# RAIGO

**The open standard and policy engine for AI agent governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.2.0-orange.svg)](https://github.com/PericuloLimited/raigo/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![npm](https://img.shields.io/npm/v/@periculo/raigo.svg)](https://www.npmjs.com/package/@periculo/raigo)

[Documentation](https://raigo.ai) · [Specification](./SPECIFICATION.md) · [Architecture](./ARCHITECTURE.md) · [Examples](./examples/) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

RAIGO (Runtime AI Governance Object) is an open-source policy standard and engine for AI agents. It enables unified, deterministic policy enforcement across the entire AI stack — from chat interfaces to autonomous agents, workflow automation platforms, and LLM API calls.

You define your governance rules once in a `.raigo` file. RAIGO enforces them everywhere.

---

## How It Works

RAIGO operates as a **policy decision point** — a lightweight engine that sits in the path of your AI traffic. Before a prompt reaches an LLM, RAIGO evaluates it against your active policy. The decision is deterministic: `ALLOW`, `DENY`, or `WARN`.

```
Your Application
      │
      ▼
┌─────────────┐         ┌──────────────┐
│ RAIGO Engine│─ ALLOW ─▶   LLM API   │
│  (policy.   │         │ (OpenAI,     │
│   raigo)    │─ DENY  ─▶  Anthropic, │
└─────────────┘   │      │  etc.)      │
                  │      └──────────────┘
                  ▼
         Violation Response
         (error_code, user_message,
          audit_log, http_status)
```

This is the same architectural pattern as a Web Application Firewall (Agent Firewall) — but for AI. The key difference from system prompts is that enforcement is **deterministic**. A `DENY` rule in a `.raigo` file cannot be overridden by prompt injection, model drift, or a creative user. The engine blocks the request before the LLM ever sees it.

---

## Deployment Models

RAIGO is designed to be deployed wherever your AI applications run. The same `.raigo` policy file works across all four models.

| Model | How It Runs | Best For |
|---|---|---|
| **Compiler** | CLI tool, zero infrastructure | ChatGPT, Claude.ai, n8n, Lovable — tools that cannot call an external engine |
| **Local / Sidecar** | Binary or container alongside your app | Custom agents, OpenClaw, local LLMs (Ollama, vLLM) |
| **Self-Hosted Proxy** | Centralized proxy in your own cloud | Enterprises, defence contractors, healthcare providers |
| **RAIGO Cloud** | Managed SaaS, no infrastructure | Startups and teams who want governance without ops overhead |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full technical walkthrough of each deployment model, including how the interceptor works and how to integrate RAIGO with your own platform.

---

## The `.raigo` File: The Source of Truth

A `.raigo` file is a YAML-based, declarative policy definition. It is the single source of truth for your organization's AI governance rules. It is human-readable, version-controllable, and auditable.

```yaml
# policy.raigo
metadata:
  organisation: "Acme Healthcare Trust"
  policy_suite: "HIPAA AI Governance Baseline"
  version: "1.0.0"
  effective_date: "2026-03-01"
  owner: "Information Security Team"

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

The RAIGO Engine loads this file at startup. Every AI request is evaluated against it. When a rule fires, the engine returns a structured violation response that your application can catch, log, and handle programmatically.

See the full [`.raigo` Format Specification](./SPECIFICATION.md) for the complete schema.

---

## Quick Start

### Using the CLI (Compiler Mode)

The fastest way to get started — no server required. Compiles your `.raigo` policy into native artifacts for 9 AI platforms.

```bash
# Install globally
npm install -g @periculo/raigo

# Initialise a new policy file
raigo init

# Validate your policy file
raigo validate policy.raigo

# Compile for a specific platform
raigo compile policy.raigo --target openclaw
raigo compile policy.raigo --target chatgpt
raigo compile policy.raigo --target claude

# Compile for all platforms at once
raigo compile policy.raigo --all
```

### Calling the Engine API (Engine Mode)

When running the RAIGO Engine (locally or in the cloud), your application evaluates policies via a simple HTTP API before sending traffic to the LLM.

```javascript
// Before sending to OpenAI, check with RAIGO
const decision = await fetch('http://localhost:8181/v1/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userMessage,
    context: { data_classification: ['PHI'], environment: 'production' }
  })
});

const { result } = await decision.json();

if (result.action === 'DENY') {
  // Return the structured violation response to the user
  return { error: result.violation_response.user_message };
}

// Safe to proceed — send to LLM
const llmResponse = await openai.chat.completions.create({ ... });
```

### Using the Web Generator

Visit [raigo.ai](https://raigo.ai) to generate a `.raigo` file from plain English using the LLM-powered ingestion tool.

---

## Compilation Targets (Compiler Mode)

When running in compiler mode, RAIGO generates native enforcement artifacts for 9 platforms. Each output includes runtime handler instructions telling the platform exactly how to enforce the policy.

| Target | Output Format | How It Is Used |
|---|---|---|
| `claude` | XML System Prompt | Injected into the Claude API `system` parameter |
| `chatgpt` | Markdown Instructions | Pasted into ChatGPT Custom Instructions or Assistants API |
| `n8n` | JSON System Prompt | Loaded as a Global Variable in n8n AI Agent nodes |
| `openclaw` | JSON Constraint Schema | Placed in OpenClaw project directory and enforced natively |
| `lovable` | Markdown Knowledge Block | Added to Lovable Workspace Knowledge |
| `gemini` | JSON System Instruction | Passed as `system_instruction` in the Vertex AI API |
| `perplexity` | Markdown System Prompt | Added to Perplexity Spaces custom instructions |
| `copilot` | JSON Policy Object | Added to Microsoft Copilot Studio declarative agent manifest |
| `audit` | Markdown Summary | Human-readable compliance evidence for auditors |

---

## Integrating RAIGO into Your Platform

If you are building an AI tool, agent framework, or workflow platform, you can add native RAIGO support so your users can govern it with a `.raigo` file.

**Option 1: Engine Integration.** Configure your platform to call the RAIGO Engine API before executing AI actions. Your platform passes the proposed action to RAIGO and receives a deterministic `ALLOW`/`DENY`/`WARN` decision. This is the recommended approach for any platform that can make HTTP calls.

**Option 2: Compiler Integration.** Add a RAIGO compilation target for your platform's native policy format. When users run `raigo compile policy.raigo --target yourplatform`, RAIGO generates the correct artifact for your platform to load and enforce natively.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed integration guide.

---

## Why RAIGO?

| The Problem | The RAIGO Solution |
|---|---|
| System prompts are suggestions, not enforceable rules | Deterministic policy evaluation before requests reach the LLM |
| Every AI tool requires a different policy format | One `.raigo` file compiles to all targets simultaneously |
| Policies live in people's heads or Word documents | Machine-readable, version-controlled, auditable policy-as-code |
| No standard way to govern AI agents across an organization | An open standard, deployable anywhere: local, cloud, or SaaS |
| Compliance evidence is manual and fragile | Automated audit summaries and structured violation logs |
| Governance is all-or-nothing | Granular severity levels: `DENY`, `WARN`, `ENFORCE` |

---

## Examples

| Example | Compliance Framework | Description |
|---|---|---|
| [`healthcare.raigo`](./examples/healthcare.raigo) | HIPAA | Policies for healthcare AI agents handling patient data |
| [`defence.raigo`](./examples/defence.raigo) | CMMC | Policies for defence contractors and classified information handling |
| [`startup.raigo`](./examples/startup.raigo) | General | Sensible defaults for early-stage teams |

---

## Ecosystem

| Tool | Status | Description |
|---|---|---|
| RAIGO CLI | **Available** | Compile, validate, and initialize `.raigo` files |
| RAIGO Web Generator | **Available** | LLM-powered natural language policy ingestion |
| RAIGO Engine (Local) | **Available** | Lightweight binary for local/sidecar deployment |
| RAIGO Engine (Cloud) | **In Development** | Managed SaaS policy evaluation API — [join the waitlist](https://meetings-eu1.hubspot.com/harrison-mussell/30-min-strategy-call) |
| VS Code Extension | Planned | Syntax highlighting, linting, live compilation |
| GitHub Action | Planned | Validate `.raigo` files in CI/CD pipelines |
| Policy Registry | Planned | Public registry for sharing community policies |

---

## Production Adopters

Does your organization use RAIGO in production? Please submit a pull request to add yourself to [ADOPTERS.md](./ADOPTERS.md).

---

## Contributing

RAIGO is an open standard and we welcome contributions of all kinds. Please read the [Contributing Guide](./CONTRIBUTING.md), review our [Governance Model](./GOVERNANCE.md), and check the [Roadmap](./ROADMAP.md).

---

## Security

Please report vulnerabilities to **security@periculo.co.uk**. See our [Security Policy](./SECURITY.md).

---

## Enterprise

The **Periculo Enterprise Control Plane** provides centralized policy management, automatic sync to connected tools, fleet-wide enforcement, and a full audit trail across all deployment models.

[Book a free 30-minute AI Security Strategy Call →](https://meetings-eu1.hubspot.com/harrison-mussell/30-min-strategy-call)

---

## License

MIT © [Periculo Security](https://periculo.co.uk)

RAIGO is developed and maintained by [Periculo Security](https://periculo.co.uk), a cybersecurity company specialising in AI governance for defence and healthcare sectors.
