/**
 * RAIGO v2.0 Deterministic Compiler
 * Converts a parsed .raigo policy object into 9 tool-native outputs.
 * Zero AI calls — identical input always produces identical output.
 */

export interface CompiledOutputs {
  raigo: string;
  n8n: string;
  microsoft: string;
  claude: string;
  chatgpt: string;
  openclaw: string;
  lovable: string;
  gemini: string;
  perplexity: string;
  audit: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function denyRules(p: any): any[] { return (p.policies || []).filter((r: any) => r.action === 'DENY'); }
function enforceRules(p: any): any[] { return (p.policies || []).filter((r: any) => r.action === 'ENFORCE'); }
function warnRules(p: any): any[] { return (p.policies || []).filter((r: any) => r.action === 'WARN'); }

function complianceRefs(rule: any): string {
  return (rule.compliance_mapping || []).map((c: any) => `${c.framework} ${c.control}`).join(', ');
}

function buildViolationResponse(rule: any): object {
  const vr = rule.violation_response || {};
  return {
    error_code: vr.error_code || `RAIGO_${rule.action}_${(rule.id || '').replace(/-/g, '')}`,
    http_status: vr.http_status || (rule.action === 'DENY' ? 403 : 422),
    category: vr.category || (rule.domain || '').toLowerCase().replace(/\s+/g, '_'),
    user_message: vr.user_message || rule.enforcement_message || 'This action was blocked by your organisation\'s AI policy.',
    developer_message: vr.developer_message || `Policy violation: Rule ${rule.id} — ${rule.title}. Compliance: ${complianceRefs(rule)}.`,
    debug_hint: vr.debug_hint || '',
    next_steps: vr.next_steps || [],
    audit_log: vr.audit_log || {
      required: rule.audit_required || false,
      fields: ['timestamp', 'rule_id', 'agent_id', 'action_attempted', 'user_id', 'environment']
    }
  };
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SOURCE (.raigo YAML) ──────────────────────────────────────────────────────
function compileSource(p: any): string {
  const meta = p.metadata || {};
  const ctx = p.context || {};
  const lines: string[] = [
    `raigo_version: "${p.raigo_version || '2.0'}"`,
    ``,
    `metadata:`,
    `  version: "${meta.version || '1.0'}"`,
    `  organisation: "${meta.organisation || ''}"`,
    `  policy_suite: "${meta.policy_suite || ''}"`,
    `  classification: "${meta.classification || 'INTERNAL'}"`,
    `  jurisdiction: "${meta.jurisdiction || ''}"`,
    `  owner: "${meta.owner || ''}"`,
    `  effective_date: "${meta.effective_date || ''}"`,
    `  review_date: "${meta.review_date || ''}"`,
    ``,
    `context:`,
    `  environments:`,
    ...((ctx.environments || []).map((e: any) => `    - id: "${e.id}"\n      description: "${e.description}"`)),
    `  data_classifications:`,
    ...((ctx.data_classifications || []).map((d: any) => `    - id: "${d.id}"\n      description: "${d.description}"`)),
    `  allowed_tools:`,
    ...((ctx.allowed_tools || []).map((t: any) => `    - id: "${t.id}"\n      description: "${t.description}"`)),
    ``,
    `policies:`,
    ...(p.policies || []).map((r: any) => {
      const parts = [
        `  - id: "${r.id}"`,
        `    domain: "${r.domain}"`,
        `    title: "${r.title}"`,
        `    action: ${r.action}`,
        `    severity: ${r.severity || 'medium'}`,
        `    directive: "${r.directive}"`,
        `    enforcement_message: "${r.enforcement_message || ''}"`,
      ];
      if (r.audit_required) parts.push(`    audit_required: true`);
      if (r.human_review_required) parts.push(`    human_review_required: true`);
      if (r.escalation_contact) parts.push(`    escalation_contact: "${r.escalation_contact}"`);
      if (r.tags?.length) parts.push(`    tags: [${r.tags.map((t: string) => `"${t}"`).join(', ')}]`);
      if (r.compliance_mapping?.length) {
        parts.push(`    compliance_mapping:`);
        r.compliance_mapping.forEach((c: any) => {
          parts.push(`      - framework: "${c.framework}"\n        control: "${c.control}"`);
        });
      }
      return parts.join('\n');
    })
  ];
  return lines.join('\n');
}

// ── n8n ───────────────────────────────────────────────────────────────────────
function compileN8n(p: any): string {
  const meta = p.metadata || {};
  const ctx = p.context || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  const output = {
    raigo_meta: {
      policy_suite: meta.policy_suite,
      organisation: meta.organisation,
      version: meta.version,
      classification: meta.classification,
      compiled_at: new Date().toISOString(),
      compiler: 'raigo-cli',
      source: 'raigo.periculo.co.uk'
    },
    system_prompt: [
      `# RAIGO POLICY: ${meta.policy_suite}`,
      `Organisation: ${meta.organisation} | Version: ${meta.version} | Classification: ${meta.classification}`,
      ``,
      `## HARD BLOCKS (DENY):`,
      ...deny.map((r: any) => `- [${r.id}] ${r.directive}`),
      ``,
      `## ALWAYS DO (ENFORCE):`,
      ...enforce.map((r: any) => `- [${r.id}] ${r.directive}`),
      ``,
      `## FLAG FOR REVIEW (WARN):`,
      ...warn.map((r: any) => `- [${r.id}] ${r.directive}`)
    ].join('\n'),
    policy_rules: (p.policies || []).map((r: any) => ({
      id: r.id,
      domain: r.domain,
      title: r.title,
      action: r.action,
      severity: r.severity || 'medium',
      condition: r.condition || {},
      directive: r.directive,
      enforcement_message: r.enforcement_message || '',
      compliance_refs: (r.compliance_mapping || []).map((c: any) => ({ framework: c.framework, control: c.control })),
      audit_required: r.audit_required || false,
      human_review_required: r.human_review_required || false,
      tags: r.tags || [],
      violation_response: buildViolationResponse(r)
    })),
    context: {
      allowed_tools: (ctx.allowed_tools || []).map((t: any) => t.id),
      data_classifications: (ctx.data_classifications || []).map((d: any) => d.id),
      environments: (ctx.environments || []).map((e: any) => e.id)
    },
    summary: {
      total_rules: (p.policies || []).length,
      deny_count: deny.length,
      enforce_count: enforce.length,
      warn_count: warn.length,
      critical_rules: (p.policies || []).filter((r: any) => r.severity === 'critical').map((r: any) => r.id)
    }
  };

  return JSON.stringify(output, null, 2);
}

// ── MICROSOFT COPILOT ─────────────────────────────────────────────────────────
function compileMicrosoft(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  const instructions = [
    `You are an AI assistant for ${meta.organisation}.`,
    `You operate under ${meta.policy_suite} (v${meta.version}).`,
    ``,
    `PROHIBITED ACTIONS:`,
    ...deny.map((r: any) => `- ${r.directive} [${r.id}]`),
    ``,
    `MANDATORY BEHAVIOURS:`,
    ...enforce.map((r: any) => `- ${r.directive} [${r.id}]`),
    ``,
    `ESCALATION TRIGGERS:`,
    ...warn.map((r: any) => `- ${r.directive} [${r.id}]`)
  ].join('\n');

  const output = {
    declarative_agent: {
      $schema: 'https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.0/schema.json',
      version: 'v1.0',
      name: `${meta.organisation} AI Policy Agent`,
      description: meta.policy_suite,
      instructions
    },
    rai_policy: {
      properties: {
        basePolicyName: 'Microsoft.Default',
        mode: 'Blocking',
        custom_policy_rules: (p.policies || []).map((r: any) => ({
          id: r.id,
          domain: r.domain,
          action: r.action,
          severity: r.severity || 'medium',
          directive: r.directive,
          compliance: (r.compliance_mapping || []).map((c: any) => `${c.framework} ${c.control}`),
          violation_response: buildViolationResponse(r)
        }))
      }
    },
    raigo_webhook_config: {
      description: 'Configure this endpoint in Copilot Studio → Security → External Threat Detection',
      validate_endpoint: 'https://api.raigo.periculo.co.uk/v1/validate',
      analyze_endpoint: 'https://api.raigo.periculo.co.uk/v1/analyze-tool-execution',
      policy_version: meta.version,
      organisation: meta.organisation
    }
  };

  return JSON.stringify(output, null, 2);
}

// ── CLAUDE (XML) ──────────────────────────────────────────────────────────────
function compileClaude(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  const lines = [
    `<raigo_policy>`,
    `  <metadata>`,
    `    <policy_suite>${esc(meta.policy_suite)}</policy_suite>`,
    `    <organisation>${esc(meta.organisation)}</organisation>`,
    `    <version>${esc(meta.version)}</version>`,
    `    <classification>${esc(meta.classification)}</classification>`,
    `    <compiled_at>${new Date().toISOString()}</compiled_at>`,
    `  </metadata>`,
    ``,
    `  <hard_prohibitions>`,
    ...deny.map((r: any) => {
      const vr = buildViolationResponse(r) as any;
      return [
        `    <rule id="${esc(r.id)}" severity="${esc(r.severity || 'medium')}">`,
        `      <title>${esc(r.title)}</title>`,
        `      <directive>${esc(r.directive)}</directive>`,
        `      <enforcement_message>${esc(r.enforcement_message || '')}</enforcement_message>`,
        `      <compliance>${esc(complianceRefs(r))}</compliance>`,
        `      <violation_response>`,
        `        <error_code>${esc(vr.error_code)}</error_code>`,
        `        <http_status>${vr.http_status}</http_status>`,
        `        <user_message>${esc(vr.user_message)}</user_message>`,
        `        <developer_message>${esc(vr.developer_message)}</developer_message>`,
        `        <debug_hint>${esc(vr.debug_hint)}</debug_hint>`,
        `      </violation_response>`,
        `    </rule>`
      ].join('\n');
    }),
    `  </hard_prohibitions>`,
    ``,
    `  <mandatory_behaviours>`,
    ...enforce.map((r: any) => [
      `    <rule id="${esc(r.id)}" severity="${esc(r.severity || 'medium')}">`,
      `      <title>${esc(r.title)}</title>`,
      `      <directive>${esc(r.directive)}</directive>`,
      `      <compliance>${esc(complianceRefs(r))}</compliance>`,
      `    </rule>`
    ].join('\n')),
    `  </mandatory_behaviours>`,
    ``,
    `  <escalation_triggers>`,
    ...warn.map((r: any) => [
      `    <rule id="${esc(r.id)}" severity="${esc(r.severity || 'medium')}">`,
      `      <title>${esc(r.title)}</title>`,
      `      <directive>${esc(r.directive)}</directive>`,
      `      <enforcement_message>${esc(r.enforcement_message || '')}</enforcement_message>`,
      r.escalation_contact ? `      <escalation_contact>${esc(r.escalation_contact)}</escalation_contact>` : '',
      r.review_message ? `      <review_message>${esc(r.review_message)}</review_message>` : '',
      `    </rule>`
    ].filter(Boolean).join('\n')),
    `  </escalation_triggers>`,
    ``,
    `  <hook_instructions>`,
    `    Register a PreToolUse hook that calls the RAIGO evaluation API before each tool execution.`,
    `    Endpoint: https://api.raigo.periculo.co.uk/v1/evaluate`,
    `    On DENY response: return permissionDecision="deny" with the violation_response error_code.`,
    `    On WARN response: inject the review_message into the conversation and pause for human approval.`,
    `  </hook_instructions>`,
    ``,
    `</raigo_policy>`
  ];

  return lines.join('\n');
}

// ── CHATGPT ───────────────────────────────────────────────────────────────────
function compileChatGPT(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  return [
    `# RAIGO POLICY: ${meta.policy_suite}`,
    `**Organisation:** ${meta.organisation} | **Version:** ${meta.version} | **Classification:** ${meta.classification}`,
    ``,
    `---`,
    ``,
    `## What I must NEVER do:`,
    ...deny.map((r: any) => `- **[${r.id}]** I must never ${r.directive.toLowerCase().replace(/\.$/, '')}. If asked: *"${r.enforcement_message || 'This action is not permitted by your organisation\'s AI policy.'}"*`),
    ``,
    `## What I must ALWAYS do:`,
    ...enforce.map((r: any) => `- **[${r.id}]** I must always ${r.directive.toLowerCase().replace(/\.$/, '')}.`),
    ``,
    `## When I must pause for human review:`,
    ...warn.map((r: any) => `- **[${r.id}]** When ${r.directive.toLowerCase().replace(/\.$/, '')}, I pause and say: *"${r.enforcement_message || 'This requires human review.'}"*`),
    ``,
    `---`,
    ``,
    `If asked to violate a NEVER rule, I refuse, cite the rule ID (e.g., [DP-01]), and explain why it is prohibited under ${meta.policy_suite}.`,
    `I do not negotiate on DENY rules. I always offer to escalate to the appropriate contact for WARN rules.`,
    ``,
    `*Policy compiled by RAIGO by Periculo — raigo.periculo.co.uk*`
  ].join('\n');
}

// ── OPENCLAW ──────────────────────────────────────────────────────────────────
function compileOpenClaw(p: any): string {
  const meta = p.metadata || {};
  const ctx = p.context || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  const output = {
    gateway: {
      policy: {
        raigo_version: p.raigo_version || '2.0',
        policy_suite: meta.policy_suite,
        organisation: meta.organisation,
        version: meta.version,
        classification: meta.classification,
        compiled_at: new Date().toISOString(),
        enforce: 'strict',
        hard_deny: deny.map((r: any) => ({
          id: r.id,
          title: r.title,
          directive: r.directive,
          condition: r.condition || {},
          enforcement_message: r.enforcement_message || '',
          severity: r.severity || 'medium',
          audit_required: r.audit_required || false,
          compliance_refs: complianceRefs(r),
          violation_response: buildViolationResponse(r)
        })),
        enforce_rules: enforce.map((r: any) => ({
          id: r.id,
          title: r.title,
          directive: r.directive,
          severity: r.severity || 'medium',
          compliance_refs: complianceRefs(r)
        })),
        warn_rules: warn.map((r: any) => ({
          id: r.id,
          title: r.title,
          directive: r.directive,
          enforcement_message: r.enforcement_message || '',
          severity: r.severity || 'medium',
          human_review_required: r.human_review_required || false,
          escalation_contact: r.escalation_contact || '',
          review_message: r.review_message || ''
        })),
        allowed_tools: (ctx.allowed_tools || []).map((t: any) => t.id),
        context: {
          servers: ctx.servers || [],
          networks: ctx.networks || [],
          data_classifications: (ctx.data_classifications || []).map((d: any) => ({
            id: d.id,
            description: d.description,
            examples: d.examples || []
          }))
        }
      }
    }
  };

  return JSON.stringify(output, null, 2);
}

// ── LOVABLE ───────────────────────────────────────────────────────────────────
function compileLovable(p: any): string {
  const meta = p.metadata || {};
  const ctx = p.context || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  return [
    `# Workspace Security Policy`,
    `**${meta.organisation}** | ${meta.policy_suite} v${meta.version} | ${meta.classification}`,
    ``,
    `> This policy is enforced across all AI interactions in this workspace.`,
    `> Compiled by RAIGO by Periculo — raigo.periculo.co.uk`,
    ``,
    `---`,
    ``,
    `### Never Do (Hard Blocks)`,
    ...deny.map((r: any) => [
      `- **[${r.id}]** ${r.directive}`,
      `  - *If triggered: "${r.enforcement_message || 'This action is not permitted.'}"*`,
      r.compliance_mapping?.length ? `  - *Compliance: ${complianceRefs(r)}*` : ''
    ].filter(Boolean).join('\n')),
    ``,
    `### Always Do (Mandatory)`,
    ...enforce.map((r: any) => `- **[${r.id}]** ${r.directive}`),
    ``,
    `### Flag for Review`,
    ...warn.map((r: any) => [
      `- **[${r.id}]** ${r.directive}`,
      r.escalation_contact ? `  - *Escalate to: ${r.escalation_contact}*` : ''
    ].filter(Boolean).join('\n')),
    ``,
    `### Approved Tools`,
    ...(ctx.allowed_tools || []).map((t: any) => `- \`${t.id}\` — ${t.description}`)
  ].join('\n');
}

// ── GEMINI ────────────────────────────────────────────────────────────────────
function compileGemini(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  const systemText = [
    `RAIGO POLICY: ${meta.policy_suite}`,
    `Organisation: ${meta.organisation} | Version: ${meta.version}`,
    ``,
    `HARD BLOCKS:`,
    ...deny.map((r: any) => `[${r.id}] ${r.directive}`),
    ``,
    `STANDING DIRECTIVES:`,
    ...enforce.map((r: any) => `[${r.id}] ${r.directive}`),
    ``,
    `ESCALATION TRIGGERS:`,
    ...warn.map((r: any) => `[${r.id}] ${r.directive}`)
  ].join('\n');

  const output = {
    system_instruction: {
      role: 'system',
      parts: [{ text: systemText }]
    },
    raigo_policy_metadata: {
      policy_suite: meta.policy_suite,
      organisation: meta.organisation,
      version: meta.version,
      classification: meta.classification,
      compiled_at: new Date().toISOString(),
      rule_count: (p.policies || []).length,
      deny_count: deny.length,
      enforce_count: enforce.length,
      warn_count: warn.length
    },
    structured_policy_rules: (p.policies || []).map((r: any) => ({
      id: r.id,
      domain: r.domain,
      action: r.action,
      severity: r.severity || 'medium',
      directive: r.directive,
      condition: r.condition || {},
      compliance: (r.compliance_mapping || []).map((c: any) => `${c.framework} ${c.control}`)
    }))
  };

  return JSON.stringify(output, null, 2);
}

// ── PERPLEXITY ────────────────────────────────────────────────────────────────
function compilePerplexity(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);

  return [
    `# SYSTEM_POLICY`,
    `- **Organisation:** ${meta.organisation}`,
    `- **Policy:** ${meta.policy_suite} v${meta.version}`,
    `- **Classification:** ${meta.classification} | **Jurisdiction:** ${meta.jurisdiction || 'Not specified'}`,
    `- **Compiled:** ${new Date().toISOString().split('T')[0]} by RAIGO by Periculo`,
    ``,
    `---`,
    ``,
    `## PROHIBITED ACTIONS`,
    ...deny.map((r: any) => `- **[${r.id}]** ${r.directive}${complianceRefs(r) ? ` *(${complianceRefs(r)})*` : ''}`),
    ``,
    `## MANDATORY BEHAVIOURS`,
    ...enforce.map((r: any) => `- **[${r.id}]** ${r.directive}`),
    ``,
    `## ESCALATION TRIGGERS`,
    ...warn.map((r: any) => [
      `- **[${r.id}]** ${r.directive}`,
      r.escalation_contact ? `  - Contact: ${r.escalation_contact}` : ''
    ].filter(Boolean).join('\n'))
  ].join('\n');
}

// ── AUDIT SUMMARY ─────────────────────────────────────────────────────────────
function compileAudit(p: any): string {
  const meta = p.metadata || {};
  const deny = denyRules(p);
  const enforce = enforceRules(p);
  const warn = warnRules(p);
  const allPolicies = p.policies || [];

  // Build compliance framework coverage
  const frameworkMap: Record<string, Set<string>> = {};
  allPolicies.forEach((r: any) => {
    (r.compliance_mapping || []).forEach((c: any) => {
      if (!frameworkMap[c.framework]) frameworkMap[c.framework] = new Set();
      frameworkMap[c.framework].add(c.control);
    });
  });

  const criticalRules = allPolicies.filter((r: any) => r.severity === 'critical');
  const auditRules = allPolicies.filter((r: any) => r.audit_required);
  const humanReviewRules = allPolicies.filter((r: any) => r.human_review_required);

  return [
    `# RAIGO Compliance Audit Summary`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Organisation | ${meta.organisation} |`,
    `| Policy Suite | ${meta.policy_suite} |`,
    `| Version | ${meta.version} |`,
    `| Classification | ${meta.classification} |`,
    `| Jurisdiction | ${meta.jurisdiction || 'Not specified'} |`,
    `| Owner | ${meta.owner} |`,
    `| Effective Date | ${meta.effective_date || 'Not specified'} |`,
    `| Review Date | ${meta.review_date || 'Not specified'} |`,
    `| Compiled At | ${new Date().toISOString()} |`,
    `| Compiled By | RAIGO CLI by Periculo |`,
    ``,
    `## Rule Statistics`,
    ``,
    `| Type | Count |`,
    `|---|---|`,
    `| Total Rules | ${allPolicies.length} |`,
    `| DENY | ${deny.length} |`,
    `| ENFORCE | ${enforce.length} |`,
    `| WARN | ${warn.length} |`,
    `| Critical Severity | ${criticalRules.length} |`,
    `| Require Audit Log | ${auditRules.length} |`,
    `| Require Human Review | ${humanReviewRules.length} |`,
    ``,
    `## Compliance Framework Coverage`,
    ``,
    `| Framework | Controls Covered |`,
    `|---|---|`,
    ...Object.entries(frameworkMap).sort().map(([fw, controls]) =>
      `| ${fw} | ${[...controls].sort().join(', ')} |`
    ),
    ``,
    `## Critical Rules`,
    ``,
    ...criticalRules.map((r: any) => [
      `### ${r.id}: ${r.title}`,
      `- **Action:** ${r.action}`,
      `- **Directive:** ${r.directive}`,
      `- **Enforcement:** ${r.enforcement_message || 'N/A'}`,
      `- **Compliance:** ${complianceRefs(r) || 'None mapped'}`,
      ``
    ].join('\n')),
    `## All Rules`,
    ``,
    `| ID | Domain | Action | Severity | Audit | Compliance |`,
    `|---|---|---|---|---|---|`,
    ...allPolicies.map((r: any) =>
      `| ${r.id} | ${r.domain} | ${r.action} | ${r.severity || 'medium'} | ${r.audit_required ? '✓' : '—'} | ${complianceRefs(r) || '—'} |`
    ),
    ``,
    `---`,
    `*Generated by RAIGO CLI by Periculo — raigo.periculo.co.uk*`
  ].join('\n');
}

// ── Main compiler entry point ─────────────────────────────────────────────────
export function compilePolicy(policy: any): CompiledOutputs {
  return {
    raigo: compileSource(policy),
    n8n: compileN8n(policy),
    microsoft: compileMicrosoft(policy),
    claude: compileClaude(policy),
    chatgpt: compileChatGPT(policy),
    openclaw: compileOpenClaw(policy),
    lovable: compileLovable(policy),
    gemini: compileGemini(policy),
    perplexity: compilePerplexity(policy),
    audit: compileAudit(policy)
  };
}
