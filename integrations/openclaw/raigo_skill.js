/**
 * RAIGO Policy Enforcement Skill for OpenClaw
 * 
 * This skill integrates the RAIGO Engine into an OpenClaw agent,
 * providing deterministic policy enforcement before every LLM call.
 * 
 * Install: copy this file to ~/.openclaw/skills/raigo.js
 * Docs: https://github.com/PericuloLimited/raigo/tree/main/integrations/openclaw
 */

const http = require('http');
const https = require('https');

// ─── Default Configuration ────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  engine_url: 'http://localhost:8181',
  mode: 'enforce',        // 'enforce' | 'audit'
  block_on_error: true,   // fail-safe: block if engine unreachable
  timeout_ms: 2000,
  log_violations: true,
};

// ─── RAIGO Client ─────────────────────────────────────────────────────────────

class RaigoClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.engineUrl = new URL(this.config.engine_url);
  }

  /**
   * Evaluate a prompt/action against the RAIGO Engine.
   * Returns the full EvaluationResult from the engine.
   */
  async evaluate(prompt, context = {}) {
    const payload = JSON.stringify({
      prompt,
      context: {
        environment: context.environment || 'production',
        tool: 'openclaw',
        ...context,
      },
    });

    return new Promise((resolve, reject) => {
      const lib = this.engineUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: this.engineUrl.hostname,
        port: this.engineUrl.port || (this.engineUrl.protocol === 'https:' ? 443 : 80),
        path: '/v1/evaluate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-RAIGO-Client': 'openclaw-skill/1.0.0',
        },
        timeout: this.config.timeout_ms,
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`RAIGO Engine returned invalid JSON: ${data}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`RAIGO Engine timed out after ${this.config.timeout_ms}ms`));
      });

      req.on('error', (err) => {
        reject(new Error(`RAIGO Engine unreachable: ${err.message}`));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Health check — verify the engine is running.
   */
  async health() {
    return new Promise((resolve, reject) => {
      const lib = this.engineUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: this.engineUrl.hostname,
        port: this.engineUrl.port || 80,
        path: '/v1/health',
        method: 'GET',
        timeout: this.config.timeout_ms,
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('RAIGO Engine health check failed'));
          }
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('Health check timed out')); });
      req.on('error', reject);
      req.end();
    });
  }
}

// ─── OpenClaw Skill Definition ────────────────────────────────────────────────

module.exports = {
  name: 'raigo',
  version: '1.0.0',
  description: 'RAIGO policy enforcement — deterministic AI governance via the RAIGO Engine',
  author: 'Periculo Security',
  homepage: 'https://github.com/PericuloLimited/raigo',

  /**
   * Called by OpenClaw when the skill is loaded.
   * Verifies the RAIGO Engine is reachable.
   */
  async onLoad(agentConfig) {
    const config = agentConfig.raigo || {};
    this._client = new RaigoClient(config);
    this._config = { ...DEFAULT_CONFIG, ...config };

    try {
      const health = await this._client.health();
      console.log(`[RAIGO] Engine connected: ${health.policy.policy_suite} v${health.policy.version}`);
      console.log(`[RAIGO] Organisation: ${health.policy.organisation}`);
      console.log(`[RAIGO] Rules loaded: ${health.policy.rules}`);
      console.log(`[RAIGO] Mode: ${this._config.mode}`);
    } catch (err) {
      if (this._config.block_on_error) {
        throw new Error(`[RAIGO] Engine unreachable and block_on_error=true. Start the engine: raigo-engine policy.raigo\n${err.message}`);
      } else {
        console.warn(`[RAIGO] Warning: Engine unreachable. Running in audit-only mode. ${err.message}`);
      }
    }
  },

  /**
   * The core hook: called by OpenClaw before every LLM request.
   * Returns the original request if allowed, or throws if denied.
   */
  async beforeLLMRequest(request, agentContext) {
    const prompt = request.messages
      ? request.messages.map(m => m.content).join('\n')
      : request.prompt || '';

    let result;
    try {
      result = await this._client.evaluate(prompt, {
        environment: agentContext.environment || 'production',
        data_classification: agentContext.data_classification || [],
      });
    } catch (err) {
      // Engine unreachable
      if (this._config.block_on_error) {
        throw {
          code: 'RAIGO_ENGINE_UNREACHABLE',
          message: 'RAIGO Engine is unreachable. Request blocked (fail-safe mode).',
          details: err.message,
        };
      }
      // Audit mode: log and allow
      console.warn(`[RAIGO] Engine unreachable, allowing request in audit mode: ${err.message}`);
      return request;
    }

    // Log violation
    if (result.action !== 'ALLOW' && this._config.log_violations) {
      const v = result.violation || (result.warnings && result.warnings[0]);
      if (v) {
        console.log(`[RAIGO] ${result.action}: ${v.rule_id} — ${v.rule_title} (${v.severity})`);
      }
    }

    // Enforce: block on DENY
    if (result.action === 'DENY' && this._config.mode === 'enforce') {
      const v = result.violation;
      throw {
        code: v ? v.error_code : 'RAIGO_DENY',
        http_status: v ? v.http_status : 403,
        message: v ? v.user_message : 'Request blocked by RAIGO policy.',
        rule_id: v ? v.rule_id : null,
        severity: v ? v.severity : null,
        developer_message: v ? v.developer_message : null,
        audit_log: v ? v.audit_log : null,
        compliance_mapping: v ? v.compliance_mapping : null,
      };
    }

    // Warn: attach warning to request context but allow
    if (result.action === 'WARN' && result.warnings) {
      request._raigo_warnings = result.warnings;
    }

    return request;
  },

  /**
   * Called by OpenClaw after every LLM response.
   * Evaluates the response content against the policy.
   */
  async afterLLMResponse(response, agentContext) {
    const content = response.content || response.text || '';
    if (!content) return response;

    let result;
    try {
      result = await this._client.evaluate(content, {
        environment: agentContext.environment || 'production',
        data_classification: agentContext.data_classification || [],
      });
    } catch (err) {
      if (this._config.block_on_error) {
        throw {
          code: 'RAIGO_ENGINE_UNREACHABLE',
          message: 'RAIGO Engine is unreachable. Response blocked (fail-safe mode).',
        };
      }
      return response;
    }

    if (result.action === 'DENY' && this._config.mode === 'enforce') {
      const v = result.violation;
      throw {
        code: v ? v.error_code : 'RAIGO_DENY_RESPONSE',
        http_status: 403,
        message: v ? v.user_message : 'LLM response blocked by RAIGO policy.',
        rule_id: v ? v.rule_id : null,
        severity: v ? v.severity : null,
        developer_message: v ? v.developer_message : null,
        audit_log: v ? v.audit_log : null,
      };
    }

    return response;
  },
};
