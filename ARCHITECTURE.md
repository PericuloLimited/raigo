# RAIGO Architecture & Integration Model

To understand what RAIGO actually is, it is helpful to compare it to the Open Policy Agent (OPA). 

OPA is primarily a **runtime engine**. You run an OPA server (or sidecar), and your application makes an API call (`POST /v1/data/my/policy`) to ask OPA: *"Can this user do this thing?"* OPA evaluates the rules and returns a JSON response (`allow: true`).

**RAIGO today (v1) is NOT a runtime engine.** It is a **compiler and a standard format**. 

The core insight behind RAIGO v1 is that the AI ecosystem is highly fragmented. Most AI tools (ChatGPT, Claude, n8n, Lovable) do not have the capability to make external API calls to a central policy engine before they generate a token or execute an agentic step. They rely entirely on their system prompts, custom instructions, or internal JSON schemas.

Therefore, RAIGO v1 takes a **"compile-time" approach** to governance.

## RAIGO v1: The Compiler Architecture

In v1, RAIGO acts as a translation layer between human-readable governance and machine-enforced constraints.

1. **The Source of Truth:** You define your policies in a single, declarative `.raigo` YAML file.
2. **The Compiler:** The RAIGO CLI reads this file.
3. **The Output:** The compiler generates platform-specific artifacts (XML for Claude, JSON for n8n, Markdown for ChatGPT). 
4. **The Enforcement:** You inject these compiled artifacts directly into the respective tools.

**Why this matters for virality:**
Developers do not need to stand up a new server, manage infrastructure, or add network latency to use RAIGO today. They just run `npm install -g @periculo/raigo`, compile their policy, and paste the result into their tool. It is entirely frictionless.

### How OpenClaw Integration Works (v1)

OpenClaw is a framework for building AI agents. To integrate RAIGO with OpenClaw today, you do not set up a RAIGO server. Instead, you use the compiler:

1. You write `policy.raigo`.
2. You run `raigo compile policy.raigo --target openclaw`.
3. RAIGO generates an `openclaw_policy.json` file.
4. You place this JSON file into your OpenClaw project (e.g., as a hard constraint or system prompt).
5. When OpenClaw runs, it reads this JSON file natively and enforces the rules using its own internal mechanisms.

The "secret sauce" of RAIGO is the intelligence of the compiler — it knows exactly how to format the rules, constraints, and violation responses so that OpenClaw (or Claude, or n8n) understands them and enforces them correctly.

## RAIGO v2: The Runtime Interceptor (Future)

While the compiler approach solves the immediate problem of fragmented system prompts, it has limitations: it relies on the AI model to actually follow the instructions. For high-assurance environments (Defence, Healthcare), you need deterministic enforcement.

This is where RAIGO v2 comes in. RAIGO v2 will introduce the **RAIGO Runtime Interceptor** — a WAF-like proxy for AI traffic.

1. **The Proxy:** You route your AI API traffic (e.g., to OpenAI or Anthropic) through the RAIGO Interceptor.
2. **The Engine:** The Interceptor holds the `.raigo` policy.
3. **The Evaluation:** Before the request reaches the LLM, and before the response reaches the user, the Interceptor evaluates the payload against the policy.
4. **The Enforcement:** If a policy is violated (e.g., PII detected in the prompt), the Interceptor blocks the request deterministically, without relying on the LLM's cooperation.

This model is much closer to OPA, but purpose-built for the unstructured nature of LLM inputs and outputs.

## Summary

*   **RAIGO v1 (Current):** A standard file format (`.raigo`) and an intelligent compiler that generates native policy artifacts for fragmented AI tools. No server required. High virality, low friction.
*   **RAIGO v2 (Planned):** A runtime proxy engine for deterministic, WAF-like enforcement of `.raigo` policies across all AI traffic. High assurance, enterprise-grade.
