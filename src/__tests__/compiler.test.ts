import { compile, compileAll, SUPPORTED_TARGETS } from "../compiler";
import { parseAndValidate } from "../validator";

const SAMPLE_POLICY_YAML = `
raigo: "0.1"
metadata:
  org: "Acme Corp"
  name: "AI Governance Policy"
  version: "1.0.0"
  description: "Core AI governance rules for Acme Corp"
  author: "compliance@acme.com"
  created: "2026-01-01"
  updated: "2026-03-01"

rules:
  - id: "ACME-PHI-001"
    name: "No Patient Data Sharing"
    description: "Prevent sharing of patient health information"
    severity: "critical"
    action: "block"
    enabled: true
    triggers:
      prompt_contains:
        - "patient data"
        - "medical records"
        - "PHI"
    response: "I cannot share patient health information. This is prohibited by our AI governance policy."
    compliance:
      - "HIPAA-164.514"
      - "GDPR-Art9"
    error_code: "PHI_BLOCK_001"

  - id: "ACME-SEC-001"
    name: "No Credential Sharing"
    description: "Warn when credentials may be shared"
    severity: "high"
    action: "warn"
    enabled: true
    triggers:
      prompt_contains:
        - "password"
        - "api key"
        - "secret"
    response: "Warning: This request may involve sensitive credentials."
    compliance:
      - "SOC2-CC6.1"
    error_code: "SEC_WARN_001"
`;

describe("raigo compiler", () => {
  test("SUPPORTED_TARGETS includes all 25 adapters", () => {
    expect(SUPPORTED_TARGETS.length).toBeGreaterThanOrEqual(25);
    expect(SUPPORTED_TARGETS).toContain("openai");
    expect(SUPPORTED_TARGETS).toContain("anthropic");
    expect(SUPPORTED_TARGETS).toContain("langchain");
    expect(SUPPORTED_TARGETS).toContain("n8n");
    expect(SUPPORTED_TARGETS).toContain("aws-bedrock");
    expect(SUPPORTED_TARGETS).toContain("mcp");
    expect(SUPPORTED_TARGETS).toContain("paperclip");
  });

  test("compile to openai returns output containing rule ID", () => {
    const result = compile(SAMPLE_POLICY_YAML, "openai");
    expect(result.target).toBe("openai");
    expect(result.output).toBeTruthy();
    expect(result.output).toContain("ACME-PHI-001");
  });

  test("compile to anthropic returns output containing rule ID", () => {
    const result = compile(SAMPLE_POLICY_YAML, "anthropic");
    expect(result.target).toBe("anthropic");
    expect(result.output).toContain("ACME-PHI-001");
  });

  test("compile to langchain returns Python code", () => {
    const result = compile(SAMPLE_POLICY_YAML, "langchain");
    expect(result.target).toBe("langchain");
    expect(result.format).toBe("python");
    expect(result.output).toContain("class");
  });

  test("compile to n8n returns JSON output", () => {
    const result = compile(SAMPLE_POLICY_YAML, "n8n");
    expect(result.target).toBe("n8n");
    expect(result.format).toBe("json");
    expect(result.output).toBeTruthy();
    // n8n adapter returns a node config object
    const parsed = JSON.parse(result.output);
    expect(parsed).toBeTruthy();
  });

  test("compile to aws-bedrock returns valid JSON config", () => {
    const result = compile(SAMPLE_POLICY_YAML, "aws-bedrock");
    expect(result.target).toBe("aws-bedrock");
    expect(result.format).toBe("json");
    const parsed = JSON.parse(result.output);
    expect(parsed).toHaveProperty("name");
    expect(parsed).toHaveProperty("blockedInputMessaging");
  });

  test("compile to mcp returns output containing raigo", () => {
    const result = compile(SAMPLE_POLICY_YAML, "mcp");
    expect(result.target).toBe("mcp");
    expect(result.output.toLowerCase()).toContain("raigo");
  });

  test("compile to cursor returns output with rule content", () => {
    const result = compile(SAMPLE_POLICY_YAML, "cursor");
    expect(result.target).toBe("cursor");
    expect(result.output).toBeTruthy();
    expect(result.output).toContain("ACME-PHI-001");
  });

  test("compile to guardrailsai returns Python code", () => {
    const result = compile(SAMPLE_POLICY_YAML, "guardrailsai");
    expect(result.target).toBe("guardrailsai");
    expect(result.format).toBe("python");
  });

  test("compileAll returns results for all targets", () => {
    const results = compileAll(SAMPLE_POLICY_YAML);
    expect(Object.keys(results).length).toBeGreaterThanOrEqual(20);
    expect(results["openai"]).toBeDefined();
    expect(results["langchain"]).toBeDefined();
    expect(results["aws-bedrock"]).toBeDefined();
  });

  test("compile to paperclip returns valid SKILL.md with rule content", () => {
    const result = compile(SAMPLE_POLICY_YAML, "paperclip");
    expect(result.target).toBe("paperclip");
    expect(result.format).toBe("markdown");
    expect(result.filename).toMatch(/SKILL\.md$/);
    // Metadata table
    expect(result.output).toContain("| name |");
    expect(result.output).toContain("| description |");
    // Block rule content
    expect(result.output).toContain("ACME-PHI-001");
    expect(result.output).toContain("BLOCK Rules");
    // Warn rule content
    expect(result.output).toContain("ACME-SEC-001");
    expect(result.output).toContain("WARN Rules");
    // Mandatory protocol
    expect(result.output).toContain("Mandatory Enforcement Protocol");
    // raigo footer
    expect(result.output).toContain("discord.gg/8VDgbrju");
  });

  test("compile throws on unknown target", () => {
    expect(() => compile(SAMPLE_POLICY_YAML, "unknown-tool" as any)).toThrow();
  });

  test("compile throws on invalid YAML", () => {
    expect(() => compile("not: valid: yaml: ::::", "openai")).toThrow();
  });
});

describe("raigo validator", () => {
  test("valid policy parses successfully", () => {
    const { policy, result } = parseAndValidate(SAMPLE_POLICY_YAML);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(policy).toBeDefined();
    expect(policy!.metadata.org).toBe("Acme Corp");
    expect(policy!.rules).toHaveLength(2);
  });

  test("auto-corrects DENY to block", () => {
    const yaml = SAMPLE_POLICY_YAML.replace('action: "block"', 'action: "DENY"');
    const { policy, result } = parseAndValidate(yaml);
    expect(result.valid).toBe(true);
    expect(policy!.rules[0].action).toBe("block");
  });

  test("auto-corrects WARN to warn", () => {
    const yaml = SAMPLE_POLICY_YAML.replace('action: "warn"', 'action: "WARN"');
    const { policy, result } = parseAndValidate(yaml);
    expect(result.valid).toBe(true);
    expect(policy!.rules[1].action).toBe("warn");
  });

  test("rejects missing metadata.org", () => {
    const yaml = SAMPLE_POLICY_YAML.replace('  org: "Acme Corp"\n', "");
    const { result } = parseAndValidate(yaml);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes("org"))).toBe(true);
  });

  test("rejects invalid action value", () => {
    const yaml = SAMPLE_POLICY_YAML.replace('action: "block"', 'action: "forbid"');
    const { result } = parseAndValidate(yaml);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes("action") || e.message.includes("action"))).toBe(true);
  });

  test("rejects invalid YAML", () => {
    const { result } = parseAndValidate("not: valid: yaml: ::::");
    expect(result.valid).toBe(false);
  });
});
