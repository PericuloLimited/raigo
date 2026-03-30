# raigo Skill — Troubleshooting

## The script returns "RAIGO_API_KEY environment variable is not set"

You need to set your API key before the skill can call the raigo engine.

**Fix:** Add the following to your shell profile or agent environment configuration:

```bash
export RAIGO_API_KEY=rgo_live_xxxxxxxxxxxxxxxx
export RAIGO_ENDPOINT=https://cloud.raigo.ai/v1/evaluate
```

Get your API key from the **API Keys** section of your raigo Cloud dashboard at https://cloud.raigo.ai.

---

## The script returns HTTP 401 "Invalid API key"

Your API key is present but not being accepted.

**Possible causes:**
- The key was revoked or regenerated in raigo Cloud
- The key was copied with extra whitespace or line breaks
- You are using a test key against the production endpoint (or vice versa)

**Fix:** Go to https://cloud.raigo.ai, navigate to **API Keys**, and generate a new key. Copy it exactly as shown.

---

## The script returns HTTP 429 "API call limit reached"

Your organisation has used all API calls for the current billing period.

**Fix:** Upgrade your raigo Cloud plan or contact support at https://raigo.ai.

---

## Every prompt returns ALLOW — nothing is being blocked

Your engine is likely in **observe mode**, which returns `ALLOW` to callers so agents are never blocked. This is the default for new accounts.

**Fix:** In raigo Cloud, go to your **Engine** panel and switch the mode from **Observe** to **Enforce**. In observe mode, shadow fields (`shadowAction`, `shadowRuleId`) in the response show what would have been blocked.

---

## My policy rules are not matching — only baseline rules fire

Your compiled policy may not have been saved correctly, or the rules use an unsupported format.

**Fix:**
1. In raigo Cloud, open the **Engine** panel and check the **Rules** tab — confirm your rules appear with green status
2. Click **Compile Engine** to recompile your policy
3. Check that your `.raigo` file uses `triggers.prompt_contains` or `triggers.prompt_regex` — not the legacy `patterns:` field

---

## The curl command fails with "Could not resolve host"

The agent environment cannot reach the raigo Cloud endpoint.

**Fix:** Confirm that your agent has outbound internet access. If you are in an air-gapped environment, deploy the raigo engine on-premises and set `RAIGO_ENDPOINT` to your internal URL.

---

## I need to evaluate prompts without blocking (shadow mode)

Set your engine to **observe mode** in raigo Cloud. All responses will return `action: "ALLOW"` but the true verdict is logged and returned in shadow fields:

```json
{
  "action": "ALLOW",
  "observeMode": true,
  "shadowAction": "DENY",
  "shadowRuleId": "BL-PII-001"
}
```

This lets you audit what would be blocked before switching to enforce mode.

---

## I want to test the skill without a raigo Cloud account

Use the health endpoint to confirm connectivity:

```bash
curl https://cloud.raigo.ai/v1/health
```

Expected response:

```json
{"status":"ok","service":"raigo-cloud","version":"0.6.0"}
```

For a full test, sign up at https://cloud.raigo.ai (invite required) or request access at https://cloud.raigo.ai/request-access.

---

## Support

- Documentation: https://github.com/periculolimited/raigo
- Email: hello@raigo.ai
- Book a call: https://raigo.ai (click "Book a call")
