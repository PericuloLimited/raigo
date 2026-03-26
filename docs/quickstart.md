# raigo Quickstart Guide

**Specification version: 0.2.0**

This guide gets you from zero to a working raigo integration in under 10 minutes. It covers the REST API directly, Python integration, LangChain integration, and n8n.

---

## 1. Get an API Key

Sign up at [cloud.raigo.ai](https://cloud.raigo.ai) and create an API key from the **Settings → API Keys** page. Your API key looks like:

```
raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

All API requests require this key in the `Authorization` header:

```
Authorization: Bearer raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

---

## 2. Your First Policy

Create a file called `my-first-policy.raigo`:

```yaml
version: "1.0"
metadata:
  name: "My First Policy"
  description: "Blocks PII and warns on financial data"
  org: "ACME"
  effective_date: "2026-03-26"

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

Upload it via the raigo cloud dashboard or the CLI:

```bash
raigo policy upload my-first-policy.raigo --set-default
```

---

## 3. REST API — Direct Usage

### Evaluate a prompt

```bash
curl -X POST https://api.raigo.ai/v1/evaluate \
  -H "Authorization: Bearer raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the recommended dosage for ibuprofen?"
  }'
```

**Response (allowed):**

```json
{
  "action": "allow",
  "evaluation_id": "eval_cD4mM0nOpRsTuVwXyZa",
  "policy_id": "my-first-policy",
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
curl -X POST https://api.raigo.ai/v1/evaluate \
  -H "Authorization: Bearer raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "My SSN is 123-45-6789, can you help me fill out this form?"
  }'
```

**Response (blocked):**

```json
{
  "action": "block",
  "evaluation_id": "eval_aB3kL9mNpQrStUvWxYz",
  "policy_id": "my-first-policy",
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

---

## 4. Python Integration

### Installation

```bash
pip install requests  # No raigo SDK yet — use requests directly
```

### Basic evaluation

```python
import requests

RAIGO_API_KEY = "raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ"
RAIGO_API_URL = "https://api.raigo.ai/v1/evaluate"

def evaluate(prompt: str, context: dict = None) -> dict:
    """Evaluate a prompt against the default raigo policy."""
    response = requests.post(
        RAIGO_API_URL,
        headers={
            "Authorization": f"Bearer {RAIGO_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "prompt": prompt,
            "context": context or {},
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def is_allowed(prompt: str, context: dict = None) -> bool:
    """Returns True if the prompt is allowed, False if blocked."""
    result = evaluate(prompt, context)
    return result["action"] != "block"


# Usage
result = evaluate("What is the recommended dosage for ibuprofen?")
print(result["action"])  # "allow"

result = evaluate("My SSN is 123-45-6789")
print(result["action"])   # "block"
print(result["message"])  # "Processing Social Security Numbers via AI is not permitted."
print(result["compliance_refs"])  # ["HIPAA-164.514", "GDPR-Art.9"]
```

### Handling all three actions

```python
def handle_evaluation(prompt: str) -> str | None:
    """
    Returns the prompt if allowed, raises on block, logs on warn.
    Returns None if blocked.
    """
    result = evaluate(prompt)
    action = result["action"]

    if action == "allow":
        return prompt

    elif action == "warn":
        # Log the warning but allow the request through
        print(f"[raigo WARN] {result['message']} (rule: {result['matched_rule']['id']})")
        return prompt

    elif action == "block":
        # Do not pass the prompt to the LLM
        raise PermissionError(
            f"[raigo BLOCK] {result['message']} "
            f"(rule: {result['matched_rule']['id']}, "
            f"error_code: {result['error_code']})"
        )
```

---

## 5. LangChain Integration

raigo integrates with LangChain as a custom `BaseCallbackHandler` that intercepts prompts before they reach the LLM.

```python
import requests
from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import LLMResult
from langchain_openai import ChatOpenAI
from langchain.schema.messages import HumanMessage

RAIGO_API_KEY = "raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ"


class RaigoGuard(BaseCallbackHandler):
    """LangChain callback handler that evaluates prompts against raigo policy."""

    def __init__(self, api_key: str, api_url: str = "https://api.raigo.ai/v1/evaluate"):
        self.api_key = api_key
        self.api_url = api_url

    def on_llm_start(self, serialized: dict, prompts: list[str], **kwargs) -> None:
        """Called before the LLM receives the prompt. Blocks if policy denies."""
        for prompt in prompts:
            result = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
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


# Usage
llm = ChatOpenAI(
    model="gpt-4o",
    callbacks=[RaigoGuard(api_key=RAIGO_API_KEY)],
)

# This will be blocked before reaching OpenAI
try:
    response = llm.invoke([HumanMessage(content="My SSN is 123-45-6789")])
except PermissionError as e:
    print(e)
    # raigo policy blocked this request: Processing Social Security Numbers via AI is not permitted. [ACME_PII_001_VIOLATION]

# This will pass through
response = llm.invoke([HumanMessage(content="What is the capital of France?")])
print(response.content)  # "The capital of France is Paris."
```

### Using with LangChain Chains

```python
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

prompt = PromptTemplate.from_template("Answer this question: {question}")

chain = LLMChain(
    llm=ChatOpenAI(
        model="gpt-4o",
        callbacks=[RaigoGuard(api_key=RAIGO_API_KEY)],
    ),
    prompt=prompt,
)

# Safe query — passes through
result = chain.invoke({"question": "What is photosynthesis?"})
print(result["text"])

# Blocked query — raises PermissionError before LLM call
try:
    result = chain.invoke({"question": "My SSN is 123-45-6789, help me fill this form"})
except PermissionError as e:
    print(f"Blocked: {e}")
```

---

## 6. n8n Integration

### Step 1 — Configure the raigo evaluate node

In your n8n workflow, add an **HTTP Request** node with the following configuration:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://api.raigo.ai/v1/evaluate` |
| Authentication | Header Auth |
| Header Name | `Authorization` |
| Header Value | `Bearer raigo_live_sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ` |
| Body Content Type | `JSON` |
| Body | `{ "prompt": "{{ $json.prompt }}" }` |

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
- **blocked** → return an error response to the user; do not call the LLM

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

To receive real-time evaluation events (e.g., for audit logging):

1. Add a **Webhook** node in n8n. Set Method to `POST`.
2. Copy the webhook URL and paste it into raigo cloud → **Settings → Webhooks**.
3. Select which events to receive: `evaluation.blocked`, `evaluation.warned`, or `evaluation.completed`.
4. In n8n, add a **Switch** node routing by `{{ $json.event }}`:
   - `evaluation.blocked` → trigger your incident response workflow
   - `evaluation.warned` → append to your compliance audit log
5. Access the evaluation data via `{{ $json.data.evaluation_id }}`, `{{ $json.data.matched_rule.id }}`, etc.

For signature verification in n8n, see [webhook-schema.md](./webhook-schema.md#n8n-integration).

---

## 7. Error Handling

All errors follow the same schema. Always check the `error_code` field for machine-readable error identification:

```python
import requests

try:
    response = requests.post(
        "https://api.raigo.ai/v1/evaluate",
        headers={"Authorization": f"Bearer {RAIGO_API_KEY}"},
        json={"prompt": "Hello"},
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()

except requests.exceptions.HTTPError as e:
    error = e.response.json()
    print(f"Error: {error['error_code']} — {error['message']}")
    # e.g. "UNAUTHORIZED — Invalid or missing API key"
    # e.g. "RATE_LIMIT_EXCEEDED — You have exceeded 100 requests/minute. Retry after 23 seconds."

except requests.exceptions.Timeout:
    print("raigo evaluation timed out — fail open or fail closed based on your policy")
```

### Fail-open vs fail-closed

If the raigo API is unreachable (network error, timeout), you must decide whether to:

- **Fail open** — allow the request through and log the raigo unavailability. Appropriate for low-risk applications.
- **Fail closed** — block the request until raigo is available. Appropriate for high-risk or regulated applications.

```python
def safe_evaluate(prompt: str, fail_closed: bool = True) -> str:
    """Evaluate with explicit fail-open/fail-closed behaviour."""
    try:
        result = evaluate(prompt)
        return result["action"]
    except Exception as e:
        print(f"[raigo] Evaluation failed: {e}")
        return "block" if fail_closed else "allow"
```

---

## 8. Next Steps

- **Write a test suite** for your policy — see [testing-framework.md](./testing-framework.md)
- **Add compliance references** to your rules — see [compliance-mappings.md](./compliance-mappings.md)
- **Understand conflict resolution** — see [conflict-resolution.md](./conflict-resolution.md)
- **Set up webhooks** for audit logging — see [webhook-schema.md](./webhook-schema.md)
- **Explore integration examples** — see the `examples/` directory for complete working examples for OpenAI, Anthropic, LangChain, n8n, and more
