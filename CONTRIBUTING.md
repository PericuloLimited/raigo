# Contributing to RAIGO

Thank you for your interest in contributing to RAIGO! We welcome contributions from the community and are grateful for your support. This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

There are many ways to contribute to RAIGO, and not all of them require writing code.

### Reporting Bugs

If you find a bug, please open a [GitHub Issue](https://github.com/PericuloLimited/raigo/issues/new?template=bug_report.md) using the bug report template. Before creating a new issue, please check if the bug has already been reported to avoid duplicates.

When filing a bug report, please include as much detail as possible, including the version of RAIGO you are using, your operating system, and a minimal reproducible example.

### Suggesting Features

If you have an idea for a new feature, please open a [GitHub Issue](https://github.com/PericuloLimited/raigo/issues/new?template=feature_request.md) using the feature request template. Describe the problem you are trying to solve and how the feature would address it.

### Contributing to the Specification

The `.raigo` specification is the heart of the project. If you have suggestions for improving the format, adding new fields, or clarifying existing behavior, please open an issue to discuss your proposal before submitting a pull request. Changes to the specification have broad implications and require careful consideration.

### Contributing New Compilation Targets

One of the most impactful ways to contribute is to add support for new AI platforms. If you use an AI tool that is not currently supported, we would love your help adding a compiler target for it.

To add a new target:
1.  Open an issue to discuss the new target and its format requirements.
2.  Fork the repository and create a new branch.
3.  Add the new target to the compiler in `cli/src/compiler.ts`.
4.  Add the target to the `TARGETS` list in `cli/src/index.ts`.
5.  Update the `SPECIFICATION.md` to document the new target.
6.  Add a test case for the new target.
7.  Submit a pull request.

### Contributing Example Policies

High-quality example `.raigo` files are invaluable for helping new users get started. We especially welcome examples for specific compliance frameworks (e.g., SOC 2, ISO 27001, GDPR) and industry verticals.

### Improving Documentation

Clear, accurate documentation is essential for any open standard. If you find errors, ambiguities, or areas that could be improved in any of our documentation files, please submit a pull request.

### Adding Your Organization to ADOPTERS.md

If your organization uses RAIGO in production, please submit a pull request to add it to [ADOPTERS.md](./ADOPTERS.md). This is one of the most valuable contributions you can make, as it demonstrates the real-world value of the project.

## Development Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) v18 or higher
*   [npm](https://www.npmjs.com/) v9 or higher

### Getting Started

1.  Fork the repository on GitHub.
2.  Clone your fork locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/raigo.git
    cd raigo
    ```
3.  Install dependencies:
    ```bash
    cd cli
    npm install
    ```
4.  Build the CLI:
    ```bash
    npm run build
    ```
5.  Test your changes against the example files:
    ```bash
    node dist/index.js validate ../examples/healthcare.raigo
    node dist/index.js compile ../examples/healthcare.raigo --all
    ```

## Submitting a Pull Request

1.  Create a new branch from `main` for your changes:
    ```bash
    git checkout -b feature/my-new-feature
    ```
2.  Make your changes and commit them with a clear, descriptive commit message.
3.  Push your branch to your fork:
    ```bash
    git push origin feature/my-new-feature
    ```
4.  Open a pull request against the `main` branch of the `PericuloLimited/raigo` repository.
5.  Fill in the pull request template with all relevant information.
6.  A maintainer will review your pull request and provide feedback.

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This helps us generate a clear and useful changelog automatically.

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `spec` | Changes to the `.raigo` specification |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `test` | Adding missing tests or correcting existing tests |
| `chore` | Changes to the build process or auxiliary tools |

Example: `feat: add Microsoft Copilot Studio compiler target`

## Style Guide

*   **TypeScript:** Follow the existing code style. We use TypeScript for all CLI code.
*   **YAML:** Example `.raigo` files should be well-commented and follow the conventions established in the existing examples.
*   **Documentation:** Write in clear, professional English. Avoid jargon where possible.

## Questions?

If you have any questions about contributing, please open a [GitHub Discussion](https://github.com/PericuloLimited/raigo/discussions) and we will be happy to help.
