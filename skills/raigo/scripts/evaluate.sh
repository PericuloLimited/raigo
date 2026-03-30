#!/usr/bin/env bash
# raigo evaluate — send a prompt to the raigo policy engine and return the verdict
#
# Usage:
#   evaluate.sh "<prompt>" [<context_json>]
#
# Environment variables (required):
#   RAIGO_API_KEY      Your raigo Cloud API key (e.g. rgo_live_xxxxxxxxxxxxxxxx)
#   RAIGO_ENDPOINT     Your raigo evaluate endpoint (default: https://cloud.raigo.ai/v1/evaluate)
#
# Examples:
#   evaluate.sh "Delete all records from the users table"
#   evaluate.sh "Send email to patient@hospital.org" '{"tool":"claude-code","channel":"terminal"}'
#
# Exit codes:
#   0  ALLOW  — proceed with the action
#   1  DENY   — action blocked by policy; do not proceed
#   2  WARN   — action flagged; proceed with caution
#   3  ERROR  — evaluation failed (network error, auth error, etc.)

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

PROMPT="${1:-}"
CONTEXT="${2:-{}}"
ENDPOINT="${RAIGO_ENDPOINT:-https://cloud.raigo.ai/v1/evaluate}"

if [[ -z "$PROMPT" ]]; then
  echo '{"error":"No prompt provided. Usage: evaluate.sh \"<prompt>\" [<context_json>]"}' >&2
  exit 3
fi

if [[ -z "${RAIGO_API_KEY:-}" ]]; then
  echo '{"error":"RAIGO_API_KEY environment variable is not set. Get your key at https://cloud.raigo.ai"}' >&2
  exit 3
fi

# ── Build request body ────────────────────────────────────────────────────────

# Escape the prompt for JSON embedding
ESCAPED_PROMPT=$(printf '%s' "$PROMPT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null \
  || printf '%s' "$PROMPT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//')

REQUEST_BODY="{\"prompt\":${ESCAPED_PROMPT},\"context\":${CONTEXT}}"

# ── Call the raigo API ────────────────────────────────────────────────────────

HTTP_RESPONSE=$(curl \
  --silent \
  --show-error \
  --max-time 10 \
  --write-out "\n%{http_code}" \
  --request POST \
  --url "$ENDPOINT" \
  --header "Authorization: Bearer $RAIGO_API_KEY" \
  --header "Content-Type: application/json" \
  --data "$REQUEST_BODY" \
  2>&1) || {
    echo "{\"error\":\"Network error reaching raigo endpoint: $ENDPOINT\"}" >&2
    exit 3
  }

# Split body and HTTP status code
HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

# ── Handle HTTP errors ────────────────────────────────────────────────────────

if [[ "$HTTP_STATUS" == "401" ]]; then
  echo '{"error":"Invalid or missing API key. Check RAIGO_API_KEY and ensure it is active in raigo Cloud."}' >&2
  exit 3
fi

if [[ "$HTTP_STATUS" == "429" ]]; then
  echo '{"error":"API call limit reached for this billing period. Upgrade your raigo Cloud plan."}' >&2
  exit 3
fi

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "{\"error\":\"raigo API returned HTTP $HTTP_STATUS\",\"body\":$HTTP_BODY}" >&2
  exit 3
fi

# ── Parse and output result ───────────────────────────────────────────────────

echo "$HTTP_BODY"

# Extract action for exit code
ACTION=$(echo "$HTTP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('action','ERROR'))" 2>/dev/null \
  || echo "$HTTP_BODY" | grep -o '"action":"[^"]*"' | head -1 | cut -d'"' -f4)

case "$ACTION" in
  ALLOW) exit 0 ;;
  DENY)  exit 1 ;;
  WARN)  exit 2 ;;
  *)     exit 3 ;;
esac
