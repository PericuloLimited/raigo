# RAIGO Architecture & Deployment Model

RAIGO is designed to solve a fundamental problem in AI governance: **how do you enforce consistent policies across a highly fragmented ecosystem of AI tools, agents, and models?**

To solve this, RAIGO provides a flexible architecture that meets AI applications wherever they are deployed. The core of the system is the **RAIGO Engine** — a lightweight, high-performance policy evaluation server that acts like a Web Application Firewall (WAF) for AI traffic.

Because different applications have different latency, privacy, and architectural requirements, RAIGO supports four distinct deployment models.

---

## The Core Concept: The AI WAF

At its heart, RAIGO is a policy engine. You feed it a `.raigo` file (which contains your declarative governance rules), and you place it in the path of your AI traffic.

When an application or agent wants to send a prompt to an LLM, it first calls the RAIGO Engine:

1. **Request:** The application sends the proposed payload (prompt, context, tool call) to RAIGO.
2. **Evaluation:** RAIGO evaluates the payload against the active `.raigo` policy.
3. **Decision:** RAIGO returns a deterministic decision: `ALLOW`, `DENY`, or `WARN`, along with a structured violation response if a rule was triggered.
4. **Enforcement:** The application (or the RAIGO proxy itself) blocks the request or modifies the prompt before it ever reaches the LLM.

This deterministic, interceptor-based approach guarantees that policies (like "Never send PII to an external model") are enforced reliably, without relying on the LLM to follow system prompt instructions.

---

## The Four Deployment Models

The beauty of RAIGO is its deployment flexibility. The exact same `.raigo` policy file can be enforced across any of these four architectures.

### 1. The Compiler Model (Zero Infrastructure)
**Best for:** ChatGPT, Claude.ai, n8n, Lovable, lightweight agent scripts.

For tools that cannot make external API calls to a policy engine before generating a response, RAIGO operates as an intelligent compiler.

*   **How it works:** You run the RAIGO CLI (`raigo compile policy.raigo`). The compiler translates your policy into the native format required by the target tool (e.g., a structured Markdown system prompt for ChatGPT, or a JSON schema for OpenClaw).
*   **Enforcement:** The target tool enforces the policy using its own internal mechanisms.
*   **Pros:** Zero infrastructure, zero latency, instant setup.
*   **Cons:** Relies on the AI model's cooperation; not suitable for high-assurance environments.

### 2. Local / Sidecar Engine (Self-Hosted)
**Best for:** Custom AI agents, OpenClaw deployments, local LLMs (Ollama, vLLM).

For developers building their own AI applications or agents, the RAIGO Engine can run locally as a lightweight binary or sidecar container alongside the application.

*   **How it works:** You run the RAIGO Engine binary on the same machine or pod as your application. Your application makes a fast, local HTTP/gRPC call to `localhost:8181/v1/evaluate` before sending traffic to the LLM.
*   **Enforcement:** Deterministic interception by your application based on the engine's response.
*   **Pros:** Ultra-low latency (<5ms), complete data privacy (payloads never leave your network), highly scalable.
*   **Cons:** Requires you to manage the sidecar deployment.

### 3. Enterprise Cloud Proxy (Self-Hosted)
**Best for:** Large enterprises, defence contractors, healthcare providers with strict compliance requirements (CMMC, HIPAA).

For organizations that need to govern all AI traffic across multiple teams and applications from a central choke point.

*   **How it works:** You deploy the RAIGO Engine as a centralized proxy server (e.g., behind an API gateway) in your own AWS/Azure/GCP environment. All internal applications are configured to route their OpenAI/Anthropic API calls through the RAIGO proxy.
*   **Enforcement:** The proxy intercepts the request, evaluates it against the central `.raigo` policy, and either forwards it to the LLM provider or returns a 403 Forbidden with the policy violation details.
*   **Pros:** Centralized control, unified audit logging, impossible for individual development teams to bypass.
*   **Cons:** Introduces network latency; requires managing high-availability proxy infrastructure.

### 4. RAIGO SaaS (Managed Service)
**Best for:** Startups, mid-market companies, and teams that want enterprise-grade governance without managing infrastructure.

The fully managed version of the RAIGO Engine, provided by Periculo.

*   **How it works:** You point your applications to the RAIGO Cloud API endpoint. You manage your `.raigo` policies via the web dashboard. The managed engine handles the evaluation and logging.
*   **Enforcement:** Deterministic interception by your application based on the cloud engine's response.
*   **Pros:** Zero infrastructure management, built-in analytics, automatic policy syncing, seamless integration with the Periculo Control Plane.
*   **Cons:** Introduces network latency to the RAIGO Cloud; payloads leave your environment for evaluation.

---

## Integrating with OpenClaw

To illustrate how this flexibility works in practice, consider integrating RAIGO with an OpenClaw agent.

**Option A: The Compiler Route (Today)**
You run `raigo compile policy.raigo --target openclaw`. You take the resulting `openclaw_policy.json` and drop it into your OpenClaw configuration. OpenClaw reads it and attempts to enforce it natively.

**Option B: The Engine Route (The Future)**
You run the RAIGO Engine locally. You configure OpenClaw to use RAIGO as its policy decision point. Before OpenClaw executes a tool or sends a prompt, it queries `localhost:8181`. If RAIGO says `DENY`, OpenClaw halts the action immediately.

This dual approach ensures that RAIGO can be adopted instantly by individual developers (via the compiler), while providing a clear upgrade path to enterprise-grade, deterministic enforcement (via the engine) as their needs mature.
