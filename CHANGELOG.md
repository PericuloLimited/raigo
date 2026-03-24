# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
