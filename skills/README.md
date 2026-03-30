# raigo Agent Skills

This directory contains official [AgentSkills](https://agentskills.io)-compatible skill packages for raigo.

Agent Skills are portable, version-controlled packages that give AI agents new capabilities. Install a skill into any compatible agent tool and it will know how to use raigo automatically — no custom integration code required.

## Available skills

| Skill | Description | Compatible agents |
|-------|-------------|-------------------|
| [`raigo/`](raigo/) | Runtime AI policy enforcement — evaluates prompts against your compiled raigo policy before every sensitive action | Claude Code, Manus, and any AgentSkills-compatible agent |

## How to install

### Claude Code

```bash
# Copy the skill into your Claude skills directory
cp -r skills/raigo ~/.claude/skills/raigo

# Set your raigo Cloud credentials
export RAIGO_API_KEY=rgo_live_xxxxxxxxxxxxxxxx
export RAIGO_ENDPOINT=https://cloud.raigo.ai/v1/evaluate
```

### Manus

Copy the `skills/raigo/` folder into your Manus project's skills directory and add `RAIGO_API_KEY` and `RAIGO_ENDPOINT` to your project secrets.

### Other agents

Any agent that supports the [AgentSkills specification](https://agentskills.io/specification) can load these skills. Place the skill directory where your agent reads skills from and set the required environment variables.

## Getting a raigo Cloud API key

1. Sign up at [cloud.raigo.ai](https://cloud.raigo.ai) (invite required — request access at [cloud.raigo.ai/request-access](https://cloud.raigo.ai/request-access))
2. Upload your organisation's policy documents and compile your engine
3. Generate an API key from **Settings → API Keys**

See [`raigo/assets/SETUP.md`](raigo/assets/SETUP.md) for a full step-by-step guide.
