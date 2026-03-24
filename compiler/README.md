# RAIGO Compiler

The RAIGO compiler transforms a `.raigo` policy file into 9 tool-native output formats in a single command.

## Usage

```bash
python3 compile_raigo.py <policy_file.raigo> [--output-dir <dir>]
```

**Example:**

```bash
python3 compile_raigo.py examples/iso27001_healthcare.raigo --output-dir ./compiled
```

## Output Targets

| File | Target | Format |
|---|---|---|
| `n8n_policy.json` | n8n AI Agent + Code nodes | JSON with structured `policy_rules` and `violation_response` per rule |
| `microsoft_policy.json` | Microsoft Copilot + Azure RAI | JSON Declarative Agent Manifest |
| `claude_system_prompt.xml` | Anthropic Claude | XML-wrapped system prompt |
| `chatgpt_instructions.md` | ChatGPT Custom Instructions / Assistants API | Structured Markdown |
| `openclaw_policy.json` | OpenClaw gateway + SOUL.md | JSON gateway config with SOUL.md behavioural identity |
| `lovable_knowledge.md` | Lovable Workspace Knowledge | Structured Markdown |
| `gemini_system_instruction.json` | Google Vertex AI / Gemini | `system_instruction` JSON |
| `perplexity_instructions.md` | Perplexity Spaces | Structured Markdown |
| `compliance_summary.md` | Human-readable audit report | Markdown |

## Violation Response Objects

Every compiled output includes a structured `violation_response` block per rule, inspired by OPA's decision response format. This enables developers to catch, log, and debug policy violations programmatically.

**Example (n8n Code node):**

```javascript
const rules = $env.RAIGO_POLICY.policy_rules;
const denied = rules.find(r => r.action === 'DENY' && /* your condition check */);

if (denied) {
  const vr = denied.violation_response;
  throw new Error(JSON.stringify({
    error_code: vr.error_code,        // "RAIGO_DENY_DP01"
    http_status: vr.http_status,      // 403
    user_message: vr.user_message,    // Shown to end user
    developer_message: vr.developer_message,  // Full debug context
    debug_hint: vr.debug_hint,        // Actionable fix guidance
    audit_log: vr.audit_log           // Fields to log for compliance
  }));
}
```

## Requirements

```bash
pip install pyyaml
```

Python 3.8+ required.
