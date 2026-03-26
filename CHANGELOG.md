# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-26

### Changed
- `README.md` — complete rewrite to lead with the `.raigo` format as the open standard; added "The Standard" section, deployment models table, ecosystem table, and clear explanation of the spec/compiler/engine/cloud relationship
- `SPECIFICATION.md` — added "This Document" preamble clearly stating the spec is the primary open-source contribution; added stability guarantee, versioning guidance, extension field convention (`x_` prefix), and updated compliance identifiers (ISO 42001, EU AI Act, DORA, NIST AI RMF)
- All uppercase `RAIGO` references replaced with lowercase `raigo` throughout spec and README
- `raigo_version` field in examples updated to `0.3.0`

---

## [0.3.0] - 2026-03-26

### Added
- `docs/observe-mode.md` — full specification of Observe mode (warn-first onboarding): API behaviour, `observeOverride` flag, config file and env var options, recommended 7–14 day onboarding workflow, and test framework support for asserting behaviour in both modes
- `engineMode` runtime config field (`observe` | `enforce`) — set via `raigo.config.yaml` or `RAIGO_ENGINE_MODE` env var
- `observeOverride: true` field in evaluate response when a DENY rule is downgraded in Observe mode
- Test case `engineMode` field — assert expected action in both Observe and Enforce mode from the same test suite

### Changed
- Default engine mode on first deploy is now `observe` — nothing is blocked until you explicitly switch to `enforce`
- `docs/quickstart.md` updated to mention Observe mode as the default starting state

---

## [0.2.0] - 2026-03-26

### Added
- `docs/quickstart.md` — REST API, Python, LangChain, and n8n working examples with error handling and fail-open/fail-closed guidance
- `docs/testing-framework.md` — `raigo test` CLI specification, YAML test case format, and CI/CD integration guide
- `docs/compliance-mappings.md` — complete compliance reference for EU AI Act, DORA, HIPAA, ISO 42001, NIST AI RMF, GDPR, SOC 2, and 10+ additional frameworks
- `docs/webhook-schema.md` — stable, frozen JSON schemas for evaluate request/response, webhook events, and error responses; includes n8n integration guide and signature verification examples
- `docs/conflict-resolution.md` — formal specification of the most-restrictive-wins algorithm, priority override field, decision table, and worked examples

### Changed
- Version badge updated from 1.0.0 to 0.2.0 (aligning with pre-1.0 open-source convention)
- README: added Documentation section linking to all new docs

### Fixed
- Compliance reference format standardised across all examples (e.g. `EUAIA-Art.14` not `EUAIA-Art14`)


## [Unreleased]

### Added
- Planned: VS Code extension for `.raigo` syntax highlighting and linting.
- Planned: GitHub Actions template for CI/CD policy validation.

## [1.0.0] - 2026-03-24

### Added
- Initial release of the RAIGO specification (v1.0).
- TypeScript/Node.js CLI (`@periculo/raigo`) with `compile`, `validate`, `init`, and `targets` commands.
- Compiler support for 9 targets: Claude XML, ChatGPT Markdown, n8n JSON, OpenClaw JSON, Lovable Markdown, Gemini JSON, Perplexity Markdown, Microsoft Copilot JSON, and Audit Summary.
- Runtime handler instructions embedded in each compiled output, telling the AI platform how to enforce the policy at runtime.
- LLM-powered ingestor that converts natural language policies into structured `.raigo` YAML using GPT-4o with JSON schema validation.
- Example `.raigo` files for Healthcare (HIPAA), Defence (CMMC), and Startup use cases.
- Full `.raigo` Format Specification document.

[Unreleased]: https://github.com/PericuloLimited/raigo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/PericuloLimited/raigo/releases/tag/v1.0.0
