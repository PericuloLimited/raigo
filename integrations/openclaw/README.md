# RAIGO + OpenClaw Integration

This directory contains everything needed to integrate RAIGO policy enforcement into an OpenClaw agent.

## What This Integration Does

When installed, RAIGO acts as a policy decision point for your OpenClaw agent. Before the agent executes any action or sends any prompt to an LLM, it calls the RAIGO Engine. If the action violates a policy, the engine returns a `DENY` decision and the agent halts — deterministically, without relying on the LLM to follow instructions.

## Prerequisites

- [OpenClaw](https://openclaw.ai) installed and configured
- RAIGO Engine running locally (`raigo-engine policy.raigo`)
- A `.raigo` policy file (run `raigo setup` to create one)

## Quick Start

### 1. Start the RAIGO Engine

```bash
# Install the RAIGO CLI
npm install -g @periculo/raigo

# Create your policy file (interactive wizard)
raigo setup

# Start the engine
raigo-engine policy.raigo
```

The engine starts on `http://localhost:8181` by default.

### 2. Install the RAIGO Skill in OpenClaw

Copy `raigo_skill.js` into your OpenClaw skills directory:

```bash
cp raigo_skill.js ~/.openclaw/skills/raigo.js
```

### 3. Configure OpenClaw to Use RAIGO

Add to your OpenClaw agent configuration (`agent.json`):

```json
{
  "skills": ["raigo"],
  "raigo": {
    "engine_url": "http://localhost:8181",
    "mode": "enforce",
    "block_on_error": true
  }
}
```

### 4. That's It

Your OpenClaw agent will now evaluate every prompt and action against your RAIGO policy before executing. Policy violations are blocked with a structured error response.

## How It Works

```
OpenClaw Agent
      │
      │  (before any LLM call or tool execution)
      ▼
┌─────────────────────┐
│   RAIGO Skill       │  POST /v1/evaluate
│   (raigo_skill.js)  │ ──────────────────▶  RAIGO Engine
│                     │ ◀──────────────────  { allow: false, violation: {...} }
└─────────────────────┘
      │
      │  DENY → halt + return violation_response to user
      │  ALLOW → proceed with LLM call
      ▼
   LLM API
```

## The Evaluation Request

The skill sends the following payload to the RAIGO Engine:

```json
{
  "prompt": "the user's message or agent action",
  "context": {
    "environment": "production",
    "tool": "openclaw",
    "data_classification": []
  }
}
```

## The Violation Response

When a policy is violated, the engine returns:

```json
{
  "allow": false,
  "action": "DENY",
  "violation": {
    "rule_id": "DP-01",
    "rule_title": "Block PHI transmission to external systems",
    "error_code": "RAIGO_DENY_DP01",
    "http_status": 403,
    "severity": "critical",
    "user_message": "BLOCKED [DP-01]: PHI transmission is prohibited.",
    "developer_message": "Policy rule DP-01 triggered. Action: DENY. Severity: critical.",
    "audit_log": {
      "timestamp": "2026-03-24T12:00:00.000Z",
      "rule_id": "DP-01",
      "action": "DENY",
      "severity": "critical",
      "organisation": "Acme Healthcare Trust",
      "policy_suite": "HIPAA AI Governance Baseline",
      "policy_version": "1.0.0"
    }
  }
}
```

## Configuration Options

| Option | Default | Description |
|---|---|---|
| `engine_url` | `http://localhost:8181` | URL of the RAIGO Engine |
| `mode` | `enforce` | `enforce` (block on DENY) or `audit` (log only, never block) |
| `block_on_error` | `true` | If the engine is unreachable, block the request (fail-safe) |
| `timeout_ms` | `2000` | Engine request timeout in milliseconds |
| `log_violations` | `true` | Log violations to the OpenClaw audit log |
