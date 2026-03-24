# RAIGO CLI

**by Periculo** — [raigo.periculo.co.uk](https://raigo.periculo.co.uk)

The official command-line tool for the RAIGO declarative AI governance standard. Define your policies once in a `.raigo` file. Compile to every AI tool.

---

## Installation

```bash
npm install -g @periculo/raigo
```

Or run without installing:

```bash
npx @periculo/raigo compile policy.raigo --all
```

---

## Quick Start

### 1. Create a policy file

```bash
raigo init "My Organisation" --template healthcare --output policy.raigo
```

Available templates: `general`, `healthcare`, `defence`, `startup`

### 2. Edit your policy

Open `policy.raigo` in any text editor and customise the rules for your organisation.

### 3. Validate it

```bash
raigo validate policy.raigo
```

### 4. Compile to all targets

```bash
raigo compile policy.raigo --all
```

This produces a `raigo-output/` directory with 9 files — one for each supported AI platform.

---

## Commands

### `raigo compile <file>`

Compile a `.raigo` file to one or more target formats.

```bash
# Compile to all 9 targets
raigo compile policy.raigo --all

# Compile to specific targets
raigo compile policy.raigo --target n8n,claude,microsoft

# Print a single target to stdout (useful for piping)
raigo compile policy.raigo --target claude --stdout

# Specify output directory
raigo compile policy.raigo --all --output ./my-outputs
```

### `raigo validate <file>`

Validate a `.raigo` file against the RAIGO v2.0 schema.

```bash
raigo validate policy.raigo
```

### `raigo init [name]`

Create a new `.raigo` policy file from a template.

```bash
raigo init "Acme Corp" --template general
raigo init "NHS Trust" --template healthcare
raigo init "MOD Contractor" --template defence
raigo init "My Startup" --template startup
```

### `raigo targets`

List all supported compilation targets.

```bash
raigo targets
```

### `raigo info`

Show version and environment information.

---

## Supported Targets

| Target | Format | Platform |
|---|---|---|
| `n8n` | JSON | n8n workflow automation |
| `microsoft` | JSON | Microsoft Copilot Studio |
| `claude` | XML | Anthropic Claude |
| `chatgpt` | Markdown | OpenAI ChatGPT |
| `openclaw` | JSON | OpenClaw |
| `lovable` | Markdown | Lovable |
| `gemini` | JSON | Google Gemini / Vertex AI |
| `perplexity` | Markdown | Perplexity Spaces |
| `audit` | Markdown | Compliance audit summary |

---

## The `.raigo` Format

A `.raigo` file is a YAML document with three sections:

```yaml
raigo_version: "2.0"

metadata:
  version: "1.0"
  organisation: "Acme Healthcare Trust"
  policy_suite: "ISO 27001 AI Governance Baseline"
  classification: "OFFICIAL-SENSITIVE"
  jurisdiction: "UK"
  owner: "CISO"
  effective_date: "2026-01-01"
  review_date: "2027-01-01"

context:
  environments:
    - id: "production"
      description: "Live production environment"
  data_classifications:
    - id: "PHI"
      description: "Protected Health Information"
  allowed_tools:
    - id: "web_search"
      description: "Search the public internet"

policies:
  - id: "DP-01"
    domain: "Data Privacy"
    title: "Block PII transmission"
    action: DENY
    severity: critical
    directive: "Never transmit PII outside approved internal systems."
    enforcement_message: "BLOCKED [DP-01]: PII transmission is prohibited."
    audit_required: true
    compliance_mapping:
      - framework: "ISO 27001"
        control: "A.8.2"
      - framework: "UK GDPR"
        control: "Article 5(1)(f)"
    violation_response:
      error_code: "RAIGO_DENY_DP01"
      http_status: 403
      user_message: "This action was blocked by your organisation's AI policy."
      developer_message: "Rule DP-01 — PII transmission blocked."
      debug_hint: "Anonymise data before sending to external systems."
      next_steps:
        - "Remove PII fields from the payload."
        - "If transfer is required, obtain DPO approval."
```

Full specification: [SPECIFICATION.md](../SPECIFICATION.md)

---

## Example Files

See the [`examples/`](../examples/) directory for ready-to-use `.raigo` files:

- `healthcare.raigo` — HIPAA/DSPT aligned
- `defence.raigo` — CMMC/JSP 604 aligned
- `startup.raigo` — Sensible defaults for early-stage teams

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Support

- Website: [raigo.periculo.co.uk](https://raigo.periculo.co.uk)
- Email: hello@periculo.co.uk
- Issues: [github.com/PericuloLimited/raigo/issues](https://github.com/PericuloLimited/raigo/issues)

---

*RAIGO CLI is open source under the MIT licence. Built by [Periculo](https://periculo.co.uk).*
