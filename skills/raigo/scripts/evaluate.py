#!/usr/bin/env python3
"""
raigo evaluate — send a prompt to the raigo policy engine and return the verdict.

Usage:
    python3 evaluate.py "<prompt>" [<context_json>]

Environment variables (required):
    RAIGO_API_KEY      Your raigo Cloud API key (e.g. rgo_live_xxxxxxxxxxxxxxxx)
    RAIGO_ENDPOINT     Your raigo evaluate endpoint
                       (default: https://cloud.raigo.ai/v1/evaluate)

Exit codes:
    0  ALLOW  — proceed with the action
    1  DENY   — action blocked by policy; do not proceed
    2  WARN   — action flagged; proceed with caution
    3  ERROR  — evaluation failed (network error, auth error, etc.)

Example (from Python):
    import subprocess, json, sys

    result = subprocess.run(
        ["python3", "scripts/evaluate.py", prompt_text],
        capture_output=True, text=True
    )
    verdict = json.loads(result.stdout)

    if result.returncode == 1:  # DENY
        raise PermissionError(verdict.get("userMessage", "Action blocked by policy."))
    elif result.returncode == 2:  # WARN
        print(f"Warning: {verdict.get('userMessage', 'Policy warning.')}")
"""

import json
import os
import sys
import urllib.request
import urllib.error

# ── Configuration ─────────────────────────────────────────────────────────────

def main() -> int:
    prompt = sys.argv[1] if len(sys.argv) > 1 else ""
    context_raw = sys.argv[2] if len(sys.argv) > 2 else "{}"

    if not prompt:
        _error("No prompt provided. Usage: evaluate.py \"<prompt>\" [<context_json>]")
        return 3

    api_key = os.environ.get("RAIGO_API_KEY", "")
    if not api_key:
        _error(
            "RAIGO_API_KEY environment variable is not set. "
            "Get your key at https://cloud.raigo.ai"
        )
        return 3

    endpoint = os.environ.get(
        "RAIGO_ENDPOINT", "https://cloud.raigo.ai/v1/evaluate"
    )

    # Parse context
    try:
        context = json.loads(context_raw)
    except json.JSONDecodeError:
        _error(f"Invalid context JSON: {context_raw}")
        return 3

    # Build request
    payload = json.dumps({"prompt": prompt, "context": context}).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "raigo-skill/1.0",
        },
        method="POST",
    )

    # Call API
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = {}

        if status == 401:
            _error(
                "Invalid or missing API key. "
                "Check RAIGO_API_KEY and ensure it is active in raigo Cloud."
            )
        elif status == 429:
            _error(
                "API call limit reached for this billing period. "
                "Upgrade your raigo Cloud plan."
            )
        else:
            _error(f"raigo API returned HTTP {status}", err_body)
        return 3
    except Exception as exc:
        _error(f"Network error reaching raigo endpoint: {endpoint} — {exc}")
        return 3

    # Output the full response
    print(json.dumps(body, indent=2))

    # Return exit code based on action
    action = body.get("action", "ERROR")
    return {"ALLOW": 0, "DENY": 1, "WARN": 2}.get(action, 3)


def _error(message: str, detail: dict | None = None) -> None:
    payload: dict = {"error": message}
    if detail:
        payload["detail"] = detail
    print(json.dumps(payload), file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main())
