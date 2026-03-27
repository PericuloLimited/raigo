import { RaigoEnforcer, createRaigoPlugin } from "./index";

// ── Mock fetch ────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockResponse(body: object, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockClear();
});

// ── RaigoEnforcer ─────────────────────────────────────────────────────────────

describe("RaigoEnforcer", () => {
  const config = {
    engineUrl: "https://engine.example.com/v1",
    apiKey: "rgo_test_key",
  };

  it("throws if engineUrl is missing", () => {
    expect(() => new RaigoEnforcer({ engineUrl: "", apiKey: "key" })).toThrow("engineUrl is required");
  });

  it("throws if apiKey is missing", () => {
    expect(() => new RaigoEnforcer({ engineUrl: "https://x.com", apiKey: "" })).toThrow("apiKey is required");
  });

  it("strips trailing slash from engineUrl", async () => {
    const e = new RaigoEnforcer({ ...config, engineUrl: "https://engine.example.com/v1/" });
    mockResponse({ action: "ALLOW" });
    await e.evaluate({ prompt: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://engine.example.com/v1/evaluate",
      expect.any(Object)
    );
  });

  it("sends Authorization header with Bearer token", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "ALLOW" });
    await e.evaluate({ prompt: "test" });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts as RequestInit).headers).toMatchObject({
      Authorization: "Bearer rgo_test_key",
    });
  });

  it("returns ALLOW response", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "ALLOW", processingMs: 12 });
    const result = await e.evaluate({ prompt: "summarise the report" });
    expect(result?.action).toBe("ALLOW");
  });

  it("returns DENY response with ruleId", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "DENY", ruleId: "AF-03", message: "Blocked" });
    const result = await e.evaluate({ prompt: "delete all records" });
    expect(result?.action).toBe("DENY");
    expect(result?.ruleId).toBe("AF-03");
  });

  it("returns WARN response", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "WARN", message: "Sensitive data detected" });
    const result = await e.evaluate({ prompt: "show me patient names" });
    expect(result?.action).toBe("WARN");
  });

  it("fails open when engine is unreachable (failOpen: true)", async () => {
    const e = new RaigoEnforcer({ ...config, failOpen: true });
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const result = await e.evaluate({ prompt: "test" });
    expect(result).toBeNull();
  });

  it("throws when engine is unreachable and failOpen: false", async () => {
    const e = new RaigoEnforcer({ ...config, failOpen: false });
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(e.evaluate({ prompt: "test" })).rejects.toThrow("ECONNREFUSED");
  });

  it("throws on non-2xx response", async () => {
    const e = new RaigoEnforcer({ ...config, failOpen: false });
    mockResponse({ error: "Unauthorized" }, 401);
    await expect(e.evaluate({ prompt: "test" })).rejects.toThrow("401");
  });
});

// ── beforeToolCall hook ───────────────────────────────────────────────────────

describe("RaigoEnforcer.beforeToolCall", () => {
  const config = { engineUrl: "https://engine.example.com/v1", apiKey: "key" };

  it("returns block: false for ALLOW", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "ALLOW" });
    const result = await e.beforeToolCall({ toolName: "exec", input: "ls -la" });
    expect(result.block).toBe(false);
    expect(result.message).toBeUndefined();
  });

  it("returns block: true for DENY with message", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "DENY", message: "Blocked by AF-03", ruleId: "AF-03" });
    const result = await e.beforeToolCall({ toolName: "exec", input: "rm -rf /" });
    expect(result.block).toBe(true);
    expect(result.message).toContain("Blocked by AF-03");
  });

  it("returns block: false with warning for WARN", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "WARN", message: "PII detected" });
    const result = await e.beforeToolCall({ toolName: "message", input: "Send email to john@example.com" });
    expect(result.block).toBe(false);
    expect(result.warning).toContain("PII detected");
  });

  it("includes toolName in the prompt sent to engine", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "ALLOW" });
    await e.beforeToolCall({ toolName: "browser", input: "https://example.com" });
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.prompt).toContain("browser");
    expect(body.context.tool_name).toBe("browser");
  });

  it("passes channel and agentId in context", async () => {
    const e = new RaigoEnforcer(config);
    mockResponse({ action: "ALLOW" });
    await e.beforeToolCall({ toolName: "exec", input: "pwd", channel: "whatsapp", agentId: "agent-42" });
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.context.channel).toBe("whatsapp");
    expect(body.context.agent_id).toBe("agent-42");
  });

  it("fails open when engine is unreachable", async () => {
    const e = new RaigoEnforcer({ ...config, failOpen: true });
    mockFetch.mockRejectedValueOnce(new Error("timeout"));
    const result = await e.beforeToolCall({ toolName: "exec", input: "ls" });
    expect(result.block).toBe(false);
  });
});

// ── createRaigoPlugin factory ─────────────────────────────────────────────────

describe("createRaigoPlugin", () => {
  it("returns a plugin with name and hooks", () => {
    const plugin = createRaigoPlugin({
      engineUrl: "https://engine.example.com/v1",
      apiKey: "key",
    });
    expect(plugin.name).toBe("@periculo/openclaw-plugin-raigo");
    expect(typeof plugin.hooks.before_tool_call).toBe("function");
  });

  it("before_tool_call hook blocks DENY decisions", async () => {
    const plugin = createRaigoPlugin({
      engineUrl: "https://engine.example.com/v1",
      apiKey: "key",
    });
    mockResponse({ action: "DENY", message: "Blocked" });
    const result = await plugin.hooks.before_tool_call({ toolName: "exec", input: "rm -rf /" });
    expect(result.block).toBe(true);
  });
});
