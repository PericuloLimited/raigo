# raigo Webhook and Evaluate API Schema

**Specification version: 0.2.0** — **Stable**

This document defines the canonical, stable JSON schema for all raigo API interactions. The schemas defined here are frozen for the lifetime of the `0.x` version series. Breaking changes will only occur at a major version boundary and will be communicated with a minimum 90-day deprecation notice.

---

## Evaluate API

### Endpoint

```
POST /v1/evaluate
Content-Type: application/json
Authorization: Bearer <api_key>
```

### Request Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raigo.ai/schemas/v0.2/evaluate-request.json",
  "title": "EvaluateRequest",
  "type": "object",
  "required": ["prompt"],
  "additionalProperties": false,
  "properties": {
    "prompt": {
      "type": "string",
      "description": "The prompt or request text to evaluate against the active policy.",
      "minLength": 1,
      "maxLength": 32768
    },
    "policy_id": {
      "type": "string",
      "description": "The ID of the policy to evaluate against. If omitted, the organisation's default policy is used.",
      "pattern": "^[a-zA-Z0-9_-]{1,64}$"
    },
    "context": {
      "type": "object",
      "description": "Optional key-value pairs providing additional context for evaluation (user role, tool name, session ID, etc.).",
      "additionalProperties": {
        "type": "string"
      },
      "maxProperties": 20
    },
    "tool_invocations": {
      "type": "array",
      "description": "List of tool names being invoked alongside this prompt. Used to match tool_invocation trigger rules.",
      "items": {
        "type": "string",
        "maxLength": 128
      },
      "maxItems": 50
    },
    "metadata": {
      "type": "object",
      "description": "Arbitrary metadata attached to this evaluation request. Stored in audit logs but not used for rule matching.",
      "additionalProperties": {
        "type": "string"
      },
      "maxProperties": 20
    }
  }
}
```

**Example request:**

```json
{
  "prompt": "Show me the patient record for John Smith, NHS number 943-476-0193",
  "policy_id": "nhs-patient-data-v1",
  "context": {
    "user_role": "clinician",
    "session_id": "sess_abc123",
    "tool": "gpt-4o"
  },
  "metadata": {
    "application": "clinical-assistant",
    "environment": "production"
  }
}
```

---

### Response Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raigo.ai/schemas/v0.2/evaluate-response.json",
  "title": "EvaluateResponse",
  "type": "object",
  "required": ["action", "evaluation_id", "policy_id", "policy_version", "latency_ms", "evaluated_at"],
  "additionalProperties": false,
  "properties": {
    "action": {
      "type": "string",
      "enum": ["allow", "block", "warn"],
      "description": "The enforcement action determined by the policy evaluation."
    },
    "evaluation_id": {
      "type": "string",
      "description": "Unique identifier for this evaluation. Use for audit trail correlation.",
      "pattern": "^eval_[a-zA-Z0-9]{20}$"
    },
    "policy_id": {
      "type": "string",
      "description": "The ID of the policy that was evaluated."
    },
    "policy_version": {
      "type": "string",
      "description": "The version string of the policy that was evaluated."
    },
    "matched_rule": {
      "type": ["object", "null"],
      "description": "The rule that triggered, or null if action is 'allow' with no rule match.",
      "required": ["id", "name", "action", "severity"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "description": "The rule ID in ORG-CAT-NNN format."
        },
        "name": {
          "type": "string",
          "description": "Human-readable rule name."
        },
        "action": {
          "type": "string",
          "enum": ["allow", "block", "warn"]
        },
        "severity": {
          "type": "string",
          "enum": ["critical", "high", "medium", "low"]
        }
      }
    },
    "message": {
      "type": ["string", "null"],
      "description": "User-facing message from the matched rule. Null if action is 'allow' with no rule match.",
      "maxLength": 300
    },
    "error_code": {
      "type": ["string", "null"],
      "description": "Machine-readable error code from the matched rule. Null if action is 'allow'.",
      "pattern": "^[A-Z0-9_]+$"
    },
    "compliance_refs": {
      "type": "array",
      "description": "Compliance framework references from the matched rule.",
      "items": {
        "type": "string"
      }
    },
    "conflict_resolution": {
      "type": ["object", "null"],
      "description": "Present when multiple rules matched. Describes how the conflict was resolved.",
      "properties": {
        "strategy": {
          "type": "string",
          "enum": ["most_restrictive", "first_match", "highest_severity"]
        },
        "all_matched_rules": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "action": { "type": "string" },
              "severity": { "type": "string" }
            }
          }
        }
      }
    },
    "latency_ms": {
      "type": "integer",
      "description": "Time taken to evaluate the request in milliseconds.",
      "minimum": 0
    },
    "evaluated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of when the evaluation was performed."
    }
  }
}
```

**Example response — block:**

```json
{
  "action": "block",
  "evaluation_id": "eval_aB3kL9mNpQrStUvWxYz",
  "policy_id": "nhs-patient-data-v1",
  "policy_version": "1.0",
  "matched_rule": {
    "id": "NHS-PHI-001",
    "name": "Block Patient Record Access",
    "action": "block",
    "severity": "critical"
  },
  "message": "Access to patient records via AI is prohibited under NHS data governance policy.",
  "error_code": "NHS_PHI_001_VIOLATION",
  "compliance_refs": [
    "HIPAA-164.514",
    "GDPR-Art.9",
    "CQC-Reg.17"
  ],
  "conflict_resolution": null,
  "latency_ms": 3,
  "evaluated_at": "2026-03-26T14:00:00.123Z"
}
```

**Example response — allow (no rule matched):**

```json
{
  "action": "allow",
  "evaluation_id": "eval_cD4mM0nOpRsTuVwXyZa",
  "policy_id": "nhs-patient-data-v1",
  "policy_version": "1.0",
  "matched_rule": null,
  "message": null,
  "error_code": null,
  "compliance_refs": [],
  "conflict_resolution": null,
  "latency_ms": 2,
  "evaluated_at": "2026-03-26T14:00:01.456Z"
}
```

**Example response — warn:**

```json
{
  "action": "warn",
  "evaluation_id": "eval_eF5nN1oQpSuTvWxYzBb",
  "policy_id": "nhs-patient-data-v1",
  "policy_version": "1.0",
  "matched_rule": {
    "id": "NHS-PHI-002",
    "name": "Warn on Date of Birth Requests",
    "action": "warn",
    "severity": "high"
  },
  "message": "This request includes patient date of birth. Ensure data minimisation principles are followed.",
  "error_code": "NHS_PHI_002_VIOLATION",
  "compliance_refs": [
    "GDPR-Art.5",
    "UKGDPR-Art.9"
  ],
  "conflict_resolution": null,
  "latency_ms": 2,
  "evaluated_at": "2026-03-26T14:00:02.789Z"
}
```

---

## Error Responses

All error responses follow a consistent schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raigo.ai/schemas/v0.2/error-response.json",
  "title": "ErrorResponse",
  "type": "object",
  "required": ["error", "error_code", "message"],
  "properties": {
    "error": {
      "type": "string",
      "description": "Short error category."
    },
    "error_code": {
      "type": "string",
      "description": "Machine-readable error code."
    },
    "message": {
      "type": "string",
      "description": "Human-readable error description with actionable detail."
    },
    "details": {
      "type": "object",
      "description": "Additional structured error details where applicable."
    }
  }
}
```

### Error Code Reference

| HTTP Status | `error_code` | Cause | Resolution |
|---|---|---|---|
| `400` | `INVALID_REQUEST` | Request body is not valid JSON | Check Content-Type header and JSON syntax |
| `400` | `MISSING_REQUIRED_FIELD` | `prompt` field is absent | Include `prompt` in the request body |
| `400` | `PROMPT_TOO_LONG` | `prompt` exceeds 32,768 characters | Truncate or split the prompt |
| `400` | `INVALID_POLICY_ID` | `policy_id` contains invalid characters | Use only alphanumeric, hyphen, and underscore characters |
| `400` | `INVALID_YAML` | Policy file contains invalid YAML | Check YAML syntax; error `details.line` and `details.column` indicate the location |
| `401` | `UNAUTHORIZED` | API key is missing or invalid | Provide a valid `Authorization: Bearer <key>` header |
| `403` | `POLICY_NOT_FOUND` | `policy_id` does not exist for this organisation | Check the policy ID or omit to use the default policy |
| `422` | `POLICY_VALIDATION_ERROR` | Policy file fails schema validation | See `details.violations` for the list of schema errors |
| `429` | `RATE_LIMIT_EXCEEDED` | Request rate exceeds the plan limit | Retry after the duration in the `Retry-After` header |
| `500` | `INTERNAL_ERROR` | Unexpected server error | Retry with exponential backoff; contact support if persistent |

**Example 400 error — invalid YAML:**

```json
{
  "error": "bad_request",
  "error_code": "INVALID_YAML",
  "message": "Invalid YAML at line 12, column 5: expected a string value, got integer.",
  "details": {
    "line": 12,
    "column": 5,
    "field": "rules[2].severity"
  }
}
```

---

## Webhook Events

raigo can deliver real-time evaluation events to a configured webhook endpoint. Webhooks are useful for audit logging, SIEM integration, and triggering downstream workflows (e.g., in n8n).

### Webhook Request

raigo sends a `POST` request to your configured webhook URL with the following headers:

```
Content-Type: application/json
X-Raigo-Event: evaluation.completed
X-Raigo-Signature: sha256=<hmac_hex>
X-Raigo-Delivery: <delivery_id>
X-Raigo-Timestamp: <unix_timestamp>
```

### Webhook Payload Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raigo.ai/schemas/v0.2/webhook-event.json",
  "title": "WebhookEvent",
  "type": "object",
  "required": ["event", "delivery_id", "timestamp", "org_id", "data"],
  "additionalProperties": false,
  "properties": {
    "event": {
      "type": "string",
      "enum": [
        "evaluation.completed",
        "evaluation.blocked",
        "evaluation.warned",
        "policy.updated",
        "policy.activated",
        "policy.deactivated"
      ],
      "description": "The event type."
    },
    "delivery_id": {
      "type": "string",
      "description": "Unique identifier for this webhook delivery. Use for deduplication.",
      "pattern": "^wh_[a-zA-Z0-9]{20}$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of when the event was generated."
    },
    "org_id": {
      "type": "string",
      "description": "The organisation ID that generated this event."
    },
    "data": {
      "type": "object",
      "description": "Event-specific payload. Schema varies by event type (see below)."
    }
  }
}
```

### Event: `evaluation.completed`

Fired for every evaluation, regardless of outcome.

```json
{
  "event": "evaluation.completed",
  "delivery_id": "wh_aB3kL9mNpQrStUvWxYz",
  "timestamp": "2026-03-26T14:00:00.123Z",
  "org_id": "org_nhs_digital",
  "data": {
    "evaluation_id": "eval_aB3kL9mNpQrStUvWxYz",
    "action": "block",
    "policy_id": "nhs-patient-data-v1",
    "policy_version": "1.0",
    "matched_rule": {
      "id": "NHS-PHI-001",
      "name": "Block Patient Record Access",
      "action": "block",
      "severity": "critical"
    },
    "compliance_refs": ["HIPAA-164.514", "GDPR-Art.9"],
    "latency_ms": 3,
    "context": {
      "user_role": "clinician",
      "session_id": "sess_abc123"
    },
    "metadata": {
      "application": "clinical-assistant",
      "environment": "production"
    }
  }
}
```

### Event: `evaluation.blocked`

Fired only when `action` is `block`. Useful for filtering to high-priority events in n8n or SIEM systems.

### Event: `evaluation.warned`

Fired only when `action` is `warn`.

### Event: `policy.updated`

Fired when a policy is updated. The `data` object contains `policy_id`, `previous_version`, and `new_version`.

### Event: `policy.activated` / `policy.deactivated`

Fired when a policy is activated or deactivated as the default for an organisation.

---

## Webhook Signature Verification

Every webhook request includes an `X-Raigo-Signature` header containing an HMAC-SHA256 signature of the raw request body, signed with your webhook secret.

**Verification (Python):**

```python
import hmac
import hashlib

def verify_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**Verification (Node.js):**

```javascript
const crypto = require("crypto");

function verifySignature(payloadBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(payloadBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}
```

---

## n8n Integration

To receive raigo webhook events in n8n:

1. Create a **Webhook** node in n8n and set the HTTP Method to `POST`.
2. Copy the webhook URL from n8n and set it as the `RAIGO_WEBHOOK_URL` environment variable on your self-hosted engine. If using raigo cloud, paste it into the Webhooks settings page.
3. Add a **Function** node after the Webhook node to verify the signature:

```javascript
const crypto = require("crypto");
const secret = "your_webhook_secret";
const body = JSON.stringify($input.first().json);
const signature = $input.first().headers["x-raigo-signature"];
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
  throw new Error("Invalid raigo webhook signature");
}
return $input.all();
```

4. Use a **Switch** node to route by `event` type:
   - `evaluation.blocked` → trigger your incident response workflow
   - `evaluation.warned` → log to your audit system
   - `policy.updated` → notify your compliance team

The `data` object in the payload maps directly to n8n's expression syntax:

```
{{ $json.data.action }}           → "block"
{{ $json.data.matched_rule.id }}  → "NHS-PHI-001"
{{ $json.data.compliance_refs }}  → ["HIPAA-164.514", "GDPR-Art.9"]
{{ $json.data.evaluation_id }}    → "eval_aB3kL9mNpQrStUvWxYz"
```

---

## Schema Files

The JSON Schema files for all request, response, and webhook event types are available at:

```
schemas/
  evaluate-request.json
  evaluate-response.json
  webhook-event.json
  error-response.json
```

These schemas can be imported directly into tools such as Postman, Insomnia, and n8n's HTTP Request node for automatic validation and autocompletion.
