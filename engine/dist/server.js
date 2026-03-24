#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chokidar_1 = __importDefault(require("chokidar"));
const evaluator_1 = require("./evaluator");
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
║   by Periculo Security  ·  raigo.ai           ║
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
let evaluator;
try {
    evaluator = new evaluator_1.RaigoEvaluator(resolvedPath);
    const meta = evaluator.getMetadata();
    const policies = evaluator.getPolicies();
    console.log(`  ✓ Policy loaded: ${meta.policy_suite}`);
    console.log(`  ✓ Organisation:  ${meta.organisation}`);
    console.log(`  ✓ Version:       ${meta.version}`);
    console.log(`  ✓ Rules loaded:  ${policies.length} policies`);
    console.log(`  ✓ Policy file:   ${resolvedPath}`);
}
catch (err) {
    console.error(`\n  ✗ Failed to load policy: ${err.message}\n`);
    process.exit(1);
}
// ─── Hot Reload ───────────────────────────────────────────────────────────────
if (HOT_RELOAD) {
    chokidar_1.default.watch(resolvedPath).on('change', () => {
        try {
            evaluator.reload();
            console.log(`\n  ↺ Policy hot-reloaded: ${new Date().toISOString()}`);
        }
        catch (err) {
            console.error(`\n  ✗ Hot reload failed: ${err.message}`);
        }
    });
    console.log(`  ✓ Hot reload:    enabled`);
}
// ─── Express App ─────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, morgan_1.default)('  :method :url :status :response-time ms'));
// ─── Routes ───────────────────────────────────────────────────────────────────
/**
 * POST /v1/evaluate
 * The core policy evaluation endpoint.
 *
 * Body: { prompt?, content?, context? }
 * Returns: EvaluationResult
 */
app.post('/v1/evaluate', (req, res) => {
    const body = req.body;
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
    }
    else if (result.action === 'WARN' && result.warnings) {
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
app.get('/v1/health', (_req, res) => {
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
app.get('/v1/policies', (_req, res) => {
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
app.use((err, _req, res, _next) => {
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
exports.default = app;
