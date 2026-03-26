# raigo Quickstart Guide

**Specification version: 0.2.0**

This guide gets you from zero to a working raigo integration in under 10 minutes. raigo runs entirely locally or in your own infrastructure — there is no mandatory cloud dependency. If you prefer a managed option, [raigo cloud](https://cloud.raigo.ai) hosts the engine for you with the same API.

---

## 1. Run the raigo Engine

### Option A — Docker (recommended)

```bash
docker run -p 8080:8080 \
  -v $(pwd)/my-policy.raigo:/policy.raigo \
  ghcr.io/periculolimited/raigo-engine:latest
```

The engine starts on `http://localhost:8080` and loads your policy file automatically. Set `PORT` to change the port.

### Option B — Node.js

```bash
git clone https://github.com/PericuloLimited/raigo.git
cd raigo/engine
npm install
RAIGO_POLICY_FILE=../my-policy.raigo npm start
```

### Option C — Self-hosted in your infrastructure

Deploy the `engine/` directory to any Node.js host. Set the following environment variables:

| Variable | Description |
|---|---|
| `RAIGO_POLICY_FILE` | Path to a single `.raigo` policy file |
| `RAIGO_POLICY_DIR` | Path to a directory of `.raigo` files (all are loaded) |
| `PORT` | Port to listen on (default: `8080`) |
| `RAIGO_API_KEY` | Optional: require a Bearer token on all requests |

### Option D — raigo cloud

[raigo cloud](https://cloud.raigo.ai) is a managed hosted version. The API is identical — replace `http://localhost:8080` with your cloud endpoint and add your API key header.

---

## 2. Write a Policy

Create a file called `my-policy.raigo`:

```yaml
version: "1.0"
metadata:
  name: "ACME AI Governance Policy"
  description: "Blocks PII and warns on financial data"
  org: "ACME"

rules:
  - id: "ACME-PII-001"
    name: "Block Social Security Numbers"
    description: "Prevents AI from processing US Social Security Numbers"
    enabled: true
    action: block
    severity: critical
    triggers:
      prompt_contains:
        - "social security number"
        - "SSN"
        - "tax identification number"
    message: "Processing Social Security Numbers via AI is not permitted."
    error_code: "ACME_PII_001_VIOLATION"
    compliance:
      - "HIPAA-164.514"
      - "GDPR-Art.9"

  - id: "ACME-FIN-001"
    name: "Warn on Credit Card Numbers"
    description: "Flags prompts that may contain payment card data"
    enabled: true
    action: warn
    severity: high
    triggers:
      prompt_contains:
        - "credit card"
        - "card number"
        - "CVV"
        - "expiry date"
    message: "This request may contain payment card data. Ensure PCI DSS compliance."
    error_code: "ACME_FIN_001_VIOLATION"
    compliance:
      - "PCI-DSS-3.4"
```

Validate the policy before starting the engine:

```bash
raigo validate my-policy.raigo
```

---

## 3. REST API — Direct Usage

All examples use `http://localhost:8080` as the engine URL. Replace this with your self-hosted or raigo cloud endpoint as needed.

### Evaluate a prompt

```bash
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the recommended dosage for ibuprofen?"}'
```

**Response (allowed):**

```json
{
  "action": "allow",
  "evaluation_id": "eval_cD4mM0nOpRsTuVwXyZa",
  "policy_id": "my-policy",
  "policy_version": "1.0",
  "matched_rule": null,
  "message": null,
  "error_code": null,
  "compliance_refs": [],
  "conflict_resolution": null,
  "latency_ms": 2,
  "evaluated_at": "2026-03-26T14:00:00.123Z"
}
```

```bash
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "My SSN is 123-45-6789, can you help me fill out this form?"}'
```

**Response (blocked):**

```json
{
  "action": "block",
  "evaluation_id": "eval_aB3kL9mNpQrStUvWxYz",
  "policy_id": "my-policy",
  "policy_version": "1.0",
  "matched_rule": {
    "id": "ACME-PII-001",
    "name": "Block Social Security Numbers",
    "action": "block",
    "severity": "critical"
  },
  "message": "Processing Social Security Numbers via AI is not permitted.",
  "error_code": "ACME_PII_001_VIOLATION",
  "compliance_refs": ["HIPAA-164.514", "GDPR-Art.9"],
  "conflict_resolution": null,
  "latency_ms": 3,
  "evaluated_at": "2026-03-26T14:00:01.456Z"
}
```

If you have configured `RAIGO_API_KEY`, add the header to all requests:

```bash
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "..."}'
```

---

## 4. Python Integration

```python
import requests

RAIGO_ENGINE_URL = "http://localhost:8080/v1/evaluate"

def evaluate(prompt: str, context: dict = None) -> dict:
    """Evaluate a prompt against the running raigo engine."""
    response = requests.post(
        RAIGO_ENGINE_URL,
        headers={"Content-Type": "application/json"},
        json={"prompt": prompt, "context": context or {}},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def is_allowed(prompt: str, context: dict = None) -> bool:
    """Returns True if the prompt is allowed, False if blocked."""
    return evaluate(prompt, context)["action"] != "block"


# Usage
result = evaluate("What is the recommended dosage for ibuprofen?")
print(result["action"])  # "allow"

result = evaluate("My SSN is 123-45-6789")
print(result["action"])           # "block"
print(result["message"])          # "Processing Social Security Numbers via AI is not permitted."
print(result["compliance_refs"])  # ["HIPAA-164.514", "GDPR-Art.9"]
```

### Handling all three actions

```python
def handle_evaluation(prompt: str) -> str | None:
    """Returns the prompt if allowed or warned, raises PermissionError if blocked."""
    result = evaluate(prompt)
    action = result["action"]

    if action == "allow":
        return prompt

    elif action == "warn":
        print(f"[raigo WARN] {result['message']} (rule: {result['matched_rule']['id']})")
        return prompt  # warn = log but allow through

    elif action == "block":
        raise PermissionError(
            f"[raigo BLOCK] {result['message']} "
            f"(rule: {result['matched_rule']['id']}, "
            f"error_code: {result['error_code']})"
        )
```

---

## 5. LangChain Integration

raigo integrates with LangChain as a `BaseCallbackHandler` that intercepts prompts before they reach the LLM.

```python
import requests
from langchain.callbacks.base import BaseCallbackHandler
from langchain_openai import ChatOpenAI
from langchain.schema.messages import HumanMessage

RAIGO_ENGINE_URL = "http://localhost:8080/v1/evaluate"


class RaigoGuard(BaseCallbackHandler):
    """LangChain callback handler that evaluates prompts against the local raigo engine."""

    def __init__(self, engine_url: str = RAIGO_ENGINE_URL, api_key: str = None):
        self.engine_url = engine_url
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    def on_llm_start(self, serialized: dict, prompts: list[str], **kwargs) -> None:
        for prompt in prompts:
            result = requests.post(
                self.engine_url,
                headers=self.headers,
                json={"prompt": prompt},
                timeout=10,
            ).json()

            if result["action"] == "block":
                raise PermissionError(
                    f"raigo policy blocked this request: {result['message']} "
                    f"[{result['error_code']}]"
                )
            if result["action"] == "warn":
                print(f"[raigo WARN] {result['message']}")


# Usage — no API key needed for a local engine without auth
llm = ChatOpenAI(model="gpt-4o", callbacks=[RaigoGuard()])

try:
    response = llm.invoke([HumanMessage(content="My SSN is 123-45-6789")])
except PermissionError as e:
    print(e)
    # raigo policy blocked this request: Processing Social Security Numbers via AI is not permitted. [ACME_PII_001_VIOLATION]

response = llm.invoke([HumanMessage(content="What is the capital of France?")])
print(response.content)  # "The capital of France is Paris."
```

---

## 6. n8n Integration

### Step 1 — Configure the raigo evaluate node

Add an **HTTP Request** node with:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://your-raigo-engine:8080/v1/evaluate` |
| Body Content Type | `JSON` |
| Body | `{ "prompt": "{{ $json.prompt }}" }` |

If your engine has `RAIGO_API_KEY` set, add `Authorization: Bearer <key>` as a header.

### Step 2 — Route by action

Add a **Switch** node after the HTTP Request node:

| Output | Condition |
|---|---|
| `allowed` | `{{ $json.action }}` equals `allow` |
| `warned` | `{{ $json.action }}` equals `warn` |
| `blocked` | `{{ $json.action }}` equals `block` |

### Step 3 — Handle each outcome

- **allowed** → continue to your LLM node
- **warned** → log to your audit system, then continue to your LLM node
- **blocked** → return an error response; do not call the LLM

### Accessing response fields in n8n expressions

```
{{ $json.action }}                        → "block"
{{ $json.matched_rule.id }}               → "ACME-PII-001"
{{ $json.matched_rule.severity }}         → "critical"
{{ $json.message }}                       → "Processing Social Security Numbers..."
{{ $json.error_code }}                    → "ACME_PII_001_VIOLATION"
{{ $json.compliance_refs.join(', ') }}    → "HIPAA-164.514, GDPR-Art.9"
{{ $json.evaluation_id }}                 → "eval_aB3kL9mNpQrStUvWxYz"
{{ $json.latency_ms }}                    → 3
```

### Receiving webhook events in n8n

To receive real-time evaluation events from the engine (e.g. for audit logging):

1. Add a **Webhook** node in n8n. Set Method to `POST`.
2. Copy the webhook URL and configure it in your engine's `RAIGO_WEBHOOK_URL` environment variable.
3. Set `RAIGO_WEBHOOK_EVENTS` to the events you want: `evaluation.blocked`, `evaluation.warned`, or `evaluation.completed`.
4. In n8n, add a **Switch** node routing by `{{ $json.event }}`.
5. Access evaluation data via `{{ $json.data.evaluation_id }}`, `{{ $json.data.matched_rule.id }}`, etc.

For signature verification in n8n, see [webhook-schema.md](./webhook-schema.md#n8n-integration).

---

## 7. Error Handling

```python
import requests

try:
    response = requests.post(
        RAIGO_ENGINE_URL,
        headers={"Content-Type": "application/json"},
        json={"prompt": "Hello"},
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()

except requests.exceptions.HTTPError as e:
    error = e.response.json()
    print(f"Error: {error['error_code']} — {error['message']}")

except requests.exceptions.Timeout:
    print("raigo evaluation timed out — apply fail-open or fail-closed logic")
```

### Fail-open vs fail-closed

If the engine is unreachable, decide explicitly:

- **Fail open** — allow the request through and log the unavailability. Appropriate for low-risk applications.
- **Fail closed** — block the request. Appropriate for high-risk or regulated applications.

```python
def safe_evaluate(prompt: str, fail_closed: bool = True) -> str:
    try:
        return evaluate(prompt)["action"]
    except Exception as e:
        print(f"[raigo] Evaluation failed: {e}")
        return "block" if fail_closed else "allow"
```

---

## 8. Compile to Native Platform Formats

Instead of calling the engine API, compile your `.raigo` policy directly to the native format of your AI platform:

```bash
# Compile to LangChain guardrails
raigo compile my-policy.raigo --target langchain

# Compile to OpenAI system prompt format
raigo compile my-policy.raigo --target openai

# Compile to all supported targets at once
raigo compile my-policy.raigo --all --out ./compiled/
```

See the [compiler README](../compiler/README.md) for the full list of supported targets.

---

## 9. Next Steps

- **Write a test suite** for your policy — see [testing-framework.md](./testing-framework.md)
- **Add compliance references** to your rules — see [compliance-mappings.md](./compliance-mappings.md)
- **Understand conflict resolution** — see [conflict-resolution.md](./conflict-resolution.md)
- **Set up webhooks** for audit logging — see [webhook-schema.md](./webhook-schema.md)
- **Full language reference** — see [SPECIFICATION.md](../SPECIFICATION.md)
