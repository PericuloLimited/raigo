# RAIGO Roadmap

This document outlines the development roadmap for the RAIGO project. RAIGO is being built in two parallel tracks: the **Standard** (the `.raigo` file format and compiler) and the **Engine** (the deployable policy evaluation server). Both tracks are essential to the long-term vision of RAIGO as the universal governance layer for AI.

---

## v1.0 — The Standard (Current)

The foundation: a stable, well-specified file format and an intelligent compiler that generates native enforcement artifacts for the fragmented AI tool ecosystem.

**Delivered:**
- `.raigo` format specification v2.0 with structured conditions, compliance mappings, severity levels, and platform overrides.
- TypeScript/Node.js CLI (`@periculo/raigo`) with `compile`, `validate`, `init`, and `targets` commands.
- Compiler support for 9 native targets: Claude, ChatGPT, n8n, OpenClaw, Lovable, Gemini, Perplexity, Microsoft Copilot, and Audit Summary.
- Runtime handler instructions embedded in every compiled output.
- Structured violation response objects in every compiled output for programmatic error handling.
- LLM-powered natural language ingestion (converts plain English policies to `.raigo` YAML).
- Example policies for Healthcare (HIPAA), Defence (CMMC), and Startup use cases.

---

## v1.x — Standard Improvements (Q2 2026)

Hardening and expanding the compiler and format based on community feedback.

- **Additional compiler targets:** Dify, Flowise, Vertex AI Agent Builder, AWS Bedrock Guardrails.
- **Policy inheritance and composition:** Allow a `.raigo` file to extend a base policy, enabling organizations to maintain a corporate baseline and layer department-specific overrides.
- **VS Code Extension:** Syntax highlighting, schema validation, and live compilation preview for `.raigo` files.
- **GitHub Action:** `raigo validate` and `raigo compile` as CI/CD steps, so policy changes are validated on every pull request.
- **Policy Registry:** A public registry at `registry.raigo.periculo.co.uk` for sharing and discovering community-contributed policies.

---

## v2.0 — The Engine (Q3 2026)

The RAIGO Engine transforms RAIGO from a compile-time tool into a runtime policy decision point. This is the architectural shift that enables deterministic, WAF-like enforcement.

**The Engine is a lightweight HTTP/gRPC server that:**
- Loads a `.raigo` policy file at startup (or hot-reloads it on change).
- Exposes a `/v1/evaluate` endpoint that accepts a prompt payload and returns a deterministic `ALLOW`, `DENY`, or `WARN` decision.
- Returns a structured violation response object when a rule fires, including the rule ID, severity, user message, developer message, and audit fields.
- Logs all decisions to a configurable audit sink (stdout, file, Elasticsearch, Splunk).

**Deployment modes at v2.0:**
- **Local binary:** A single executable (`raigo-engine`) that runs on macOS, Linux, and Windows. Ideal for local development and sidecar deployments alongside custom AI agents.
- **Docker container:** `docker run periculo/raigo-engine` with a volume-mounted policy file.
- **RAIGO Cloud:** The managed SaaS version of the engine, hosted by Periculo. Zero infrastructure, built-in analytics, and seamless integration with the Periculo Control Plane.

---

## v2.x — Enterprise Engine Features (Q4 2026)

Building on the core engine with features that matter to large organizations.

- **Centralized proxy mode:** The engine operates as a full reverse proxy for OpenAI/Anthropic API calls, so all AI traffic in an organization is governed at the network layer without any application code changes.
- **Multi-policy support:** Load and evaluate multiple `.raigo` files simultaneously (e.g., a corporate baseline + a department-specific policy + a project-specific policy).
- **Real-time policy sync:** The engine polls a central policy store (Git repository, S3 bucket, or the Periculo Control Plane) and hot-reloads policies without restart.
- **Microsoft Copilot Studio integration:** A native connector that routes Copilot Studio agent actions through the RAIGO Engine for deterministic enforcement.
- **Periculo Enterprise Control Plane:** Centralized management UI for all RAIGO deployments across an organization — policy authoring, deployment management, audit log aggregation, and compliance reporting.

---

## Long-Term Vision

The long-term vision for RAIGO is to become the universal governance layer for AI — the standard that sits between every AI application and every LLM, ensuring that organizational policies are enforced consistently, deterministically, and auditably, regardless of which AI tools are in use.

This is analogous to what OPA became for cloud-native infrastructure: a neutral, open, general-purpose policy engine that every platform integrates with, because it is the right place to put policy logic.

The `.raigo` format is the foundation. The engine is the product. The standard is the moat.

---

## How to Influence the Roadmap

We welcome feedback and suggestions. If you have ideas for new features or compiler targets, please open a [GitHub Issue](https://github.com/PericuloLimited/raigo/issues) or start a [Discussion](https://github.com/PericuloLimited/raigo/discussions).
