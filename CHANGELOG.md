# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
