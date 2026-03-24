#!/usr/bin/env node
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import * as path from 'path';
import * as fs from 'fs';
import chokidar from 'chokidar';
import { RaigoEvaluator, EvaluationRequest } from './evaluator';

// ─── Banner ───────────────────────────────────────────────────────────────────

const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗  █████╗ ██╗ ██████╗  ██████╗                   ║
║   ██╔══██╗██╔══██╗██║██╔════╝ ██╔═══██╗                  ║
║   ██████╔╝███████║██║██║  ███╗██║   ██║                  ║
║   ██╔══██╗██╔══██║██║██║   ██║██║   ██║                  ║
║   ██║  ██║██║  ██║██║╚██████╔╝╚██████╔╝                  ║
║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝  ╚═════╝                  ║
║                                                           ║
║   Runtime AI Governance Object — Policy Engine v1.0.0    ║
║   by Periculo Security  ·  raigo.periculo.co.uk           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.RAIGO_PORT || '8181', 10);
const POLICY_PATH = process.argv[2] || process.env.RAIGO_POLICY || 'policy.raigo';
const HOT_RELOAD = process.env.RAIGO_HOT_RELOAD !== 'false';

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log(BANNER);

const resolvedPath = path.resolve(POLICY_PATH);

if (!fs.existsSync(resolvedPath)) {
  console.error(`\n  ✗ Policy file not found: ${resolvedPath}`);
  console.error(`  Usage: raigo-engine <path-to-policy.raigo>\n`);
  process.exit(1);
}

let evaluator: RaigoEvaluator;

try {
  evaluator = new RaigoEvaluator(resolvedPath);
  const meta = evaluator.getMetadata();
  const policies = evaluator.getPolicies();
  console.log(`  ✓ Policy loaded: ${meta.policy_suite}`);
  console.log(`  ✓ Organisation:  ${meta.organisation}`);
  console.log(`  ✓ Version:       ${meta.version}`);
  console.log(`  ✓ Rules loaded:  ${policies.length} policies`);
  console.log(`  ✓ Policy file:   ${resolvedPath}`);
} catch (err) {
  console.error(`\n  ✗ Failed to load policy: ${(err as Error).message}\n`);
  process.exit(1);
}

// ─── Hot Reload ───────────────────────────────────────────────────────────────

if (HOT_RELOAD) {
  chokidar.watch(resolvedPath).on('change', () => {
    try {
      evaluator.reload();
      console.log(`\n  ↺ Policy hot-reloaded: ${new Date().toISOString()}`);
    } catch (err) {
      console.error(`\n  ✗ Hot reload failed: ${(err as Error).message}`);
    }
  });
  console.log(`  ✓ Hot reload:    enabled`);
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(morgan('  :method :url :status :response-time ms'));

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /v1/evaluate
 * The core policy evaluation endpoint.
 * 
 * Body: { prompt?, content?, context? }
 * Returns: EvaluationResult
 */
app.post('/v1/evaluate', (req: Request, res: Response) => {
  const body = req.body as EvaluationRequest;

  if (!body.prompt && !body.content) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body must include at least one of: prompt, content',
    });
  }

  const result = evaluator.evaluate(body);

  // Log violations to console
  if (result.action === 'DENY' && result.violation) {
    const v = result.violation;
    console.log(`\n  ✗ POLICY VIOLATION`);
    console.log(`    Rule:     ${v.rule_id} — ${v.rule_title}`);
    console.log(`    Severity: ${v.severity.toUpperCase()}`);
    console.log(`    Action:   ${v.action}`);
    console.log(`    Message:  ${v.user_message}`);
    console.log(`    Time:     ${v.audit_log.timestamp}\n`);
  } else if (result.action === 'WARN' && result.warnings) {
    for (const w of result.warnings) {
      console.log(`\n  ⚠ POLICY WARNING`);
      console.log(`    Rule:     ${w.rule_id} — ${w.rule_title}`);
      console.log(`    Severity: ${w.severity.toUpperCase()}`);
      console.log(`    Message:  ${w.user_message}\n`);
    }
  }

  const statusCode = result.action === 'DENY' ? 403 : 200;
  return res.status(statusCode).json(result);
});

/**
 * GET /v1/health
 * Health check endpoint.
 */
app.get('/v1/health', (_req: Request, res: Response) => {
  const meta = evaluator.getMetadata();
  res.json({
    status: 'ok',
    engine: 'raigo-engine',
    version: '1.0.0',
    policy: {
      organisation: meta.organisation,
      policy_suite: meta.policy_suite,
      version: meta.version,
      rules: evaluator.getPolicies().length,
    },
    uptime_seconds: Math.floor(process.uptime()),
  });
});

/**
 * GET /v1/policies
 * List all loaded policies.
 */
app.get('/v1/policies', (_req: Request, res: Response) => {
  const policies = evaluator.getPolicies().map(p => ({
    id: p.id,
    domain: p.domain,
    title: p.title,
    action: p.action,
    severity: p.severity,
    compliance_mapping: p.compliance_mapping,
  }));
  res.json({
    organisation: evaluator.getMetadata().organisation,
    policy_suite: evaluator.getMetadata().policy_suite,
    version: evaluator.getMetadata().version,
    count: policies.length,
    policies,
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`  ✗ Server error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  ✓ Engine running:  http://localhost:${PORT}`);
  console.log(`  ✓ Evaluate:        POST http://localhost:${PORT}/v1/evaluate`);
  console.log(`  ✓ Health:          GET  http://localhost:${PORT}/v1/health`);
  console.log(`  ✓ Policies:        GET  http://localhost:${PORT}/v1/policies`);
  console.log(`\n  Waiting for requests...\n`);
});

export default app;
