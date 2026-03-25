#!/usr/bin/env node
/**
 * RAIGO CLI — by Periculo
 * The declarative standard for AI agent governance.
 * Define your policies once. Compile to every AI tool.
 *
 * https://raigo.ai
 * https://github.com/PericuloLimited/raigo
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { compilePolicy } from './compiler';
import { validatePolicy } from './validator';
import { loadPolicy } from './loader';
import { INIT_TEMPLATE } from './templates';
import { runSetupWizard } from './wizard';

const pkg = require('../package.json');

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log(chalk.bold.hex('#6600FF')('\n  ██████╗  █████╗ ██╗ ██████╗  ██████╗'));
  console.log(chalk.bold.hex('#6600FF')('  ██╔══██╗██╔══██╗██║██╔════╝ ██╔═══██╗'));
  console.log(chalk.bold.hex('#6600FF')('  ██████╔╝███████║██║██║  ███╗██║   ██║'));
  console.log(chalk.bold.hex('#6600FF')('  ██╔══██╗██╔══██║██║██║   ██║██║   ██║'));
  console.log(chalk.bold.hex('#6600FF')('  ██║  ██║██║  ██║██║╚██████╔╝╚██████╔╝'));
  console.log(chalk.bold.hex('#6600FF')('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝  ╚═════╝'));
  console.log(chalk.dim('  by Periculo — raigo.ai\n'));
}

// ── Program ───────────────────────────────────────────────────────────────────
const program = new Command();

program
  .name('raigo')
  .description('RAIGO by Periculo — Declarative AI agent governance. Define your policies once. Compile to every AI tool.')
  .version(pkg.version, '-v, --version', 'Output the current version');

// ── compile ───────────────────────────────────────────────────────────────────
program
  .command('compile <file>')
  .description('Compile a .raigo policy file to one or more target formats')
  .option('-t, --target <targets>', 'Comma-separated list of targets (n8n,microsoft,claude,chatgpt,openclaw,lovable,gemini,perplexity,audit)', 'all')
  .option('-o, --output <dir>', 'Output directory for compiled files', './raigo-output')
  .option('--all', 'Compile to all 9 targets (default)')
  .option('--stdout', 'Print a single target output to stdout instead of writing files')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action(async (file: string, options: any) => {
    if (options.banner !== false) printBanner();

    const spinner = ora({ text: chalk.dim('Loading policy file...'), color: 'magenta' }).start();

    try {
      // Resolve file path
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        spinner.fail(chalk.red(`File not found: ${filePath}`));
        process.exit(1);
      }

      // Load and parse
      spinner.text = chalk.dim('Parsing .raigo file...');
      const policy = loadPolicy(filePath);

      // Validate
      spinner.text = chalk.dim('Validating schema...');
      const validationResult = validatePolicy(policy);
      if (!validationResult.valid) {
        spinner.fail(chalk.red('Schema validation failed:'));
        validationResult.errors.forEach((e: string) => console.error(chalk.red(`  ✗ ${e}`)));
        process.exit(1);
      }

      // Determine targets
      const allTargets = ['n8n', 'microsoft', 'claude', 'chatgpt', 'openclaw', 'lovable', 'gemini', 'perplexity', 'audit'];
      let targets: string[];
      if (options.all || options.target === 'all') {
        targets = allTargets;
      } else {
        targets = options.target.split(',').map((t: string) => t.trim().toLowerCase());
        const invalid = targets.filter(t => !allTargets.includes(t));
        if (invalid.length > 0) {
          spinner.fail(chalk.red(`Unknown targets: ${invalid.join(', ')}`));
          console.log(chalk.dim(`  Valid targets: ${allTargets.join(', ')}`));
          process.exit(1);
        }
      }

      // Compile
      spinner.text = chalk.dim(`Compiling ${policy.policies?.length || 0} rules to ${targets.length} target(s)...`);
      const outputs = compilePolicy(policy);

      // Handle --stdout mode (single target only)
      if (options.stdout) {
        if (targets.length !== 1) {
          spinner.fail(chalk.red('--stdout requires exactly one target. Use -t <target>'));
          process.exit(1);
        }
        spinner.stop();
        console.log((outputs as any)[targets[0]]);
        return;
      }

      // Write files
      const outDir = path.resolve(process.cwd(), options.output);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const ext: Record<string, string> = {
        n8n: 'json', microsoft: 'json', claude: 'xml',
        chatgpt: 'md', openclaw: 'json', lovable: 'md',
        gemini: 'json', perplexity: 'md', audit: 'md'
      };

      spinner.succeed(chalk.bold.hex('#6600FF')(`Compiled ${policy.policies?.length || 0} rules → ${targets.length} output(s)`));
      console.log('');

      targets.forEach(target => {
        const filename = `${target}_policy.${ext[target]}`;
        const outPath = path.join(outDir, filename);
        fs.writeFileSync(outPath, (outputs as any)[target] || '', 'utf8');
        console.log(`  ${chalk.hex('#6600FF')('✓')} ${chalk.bold(target.padEnd(12))} → ${chalk.dim(outPath)}`);
      });

      console.log('');
      console.log(chalk.dim(`  Policy:  ${policy.metadata?.policy_suite || 'Unknown'}`));
      console.log(chalk.dim(`  Org:     ${policy.metadata?.organisation || 'Unknown'}`));
      console.log(chalk.dim(`  Rules:   ${policy.policies?.length || 0} (${policy.policies?.filter((r: any) => r.action === 'DENY').length || 0} DENY, ${policy.policies?.filter((r: any) => r.action === 'ENFORCE').length || 0} ENFORCE, ${policy.policies?.filter((r: any) => r.action === 'WARN').length || 0} WARN)`));
      console.log('');

    } catch (err: any) {
      spinner.fail(chalk.red(`Compilation failed: ${err.message}`));
      if (process.env.DEBUG) console.error(err);
      process.exit(1);
    }
  });

// ── validate ──────────────────────────────────────────────────────────────────
program
  .command('validate <file>')
  .description('Validate a .raigo file against the RAIGO v2.0 schema')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action((file: string, options: any) => {
    if (options.banner !== false) printBanner();

    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`  ✗ File not found: ${filePath}`));
      process.exit(1);
    }

    try {
      const policy = loadPolicy(filePath);
      const result = validatePolicy(policy);

      if (result.valid) {
        console.log(chalk.green(`  ✓ Valid RAIGO v${policy.raigo_version || '2.0'} policy`));
        console.log(chalk.dim(`    Organisation: ${policy.metadata?.organisation}`));
        console.log(chalk.dim(`    Rules: ${policy.policies?.length || 0}`));
        console.log(chalk.dim(`    Frameworks: ${[...new Set((policy.policies || []).flatMap((r: any) => (r.compliance_mapping || []).map((c: any) => c.framework)))].join(', ') || 'None'}`));
        console.log('');
      } else {
        console.log(chalk.red(`  ✗ Invalid .raigo file — ${result.errors.length} error(s):\n`));
        result.errors.forEach((e: string) => console.error(chalk.red(`    ✗ ${e}`)));
        console.log('');
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`  ✗ Parse error: ${err.message}`));
      process.exit(1);
    }
  });

// ── setup (interactive wizard) ───────────────────────────────────────────────
program
  .command('setup')
  .description('Interactive setup wizard — create your first .raigo policy file with pre-built templates')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action(async (options: any) => {
    if (options.banner !== false) printBanner();
    await runSetupWizard();
  });

// ── openclaw (zero-friction Agent Firewall setup) ───────────────────────────────────────
program
  .command('openclaw')
  .description('Generate an OWASP LLM Top 10 security policy for your OpenClaw agent in seconds')
  .option('-o, --output <file>', 'Output file path', 'openclaw_af.raigo')
  .option('--org <name>', 'Organisation name', 'My Organisation')
  .option('--domain <domain>', 'Email domain for escalation contacts', 'example.com')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action(async (options: any) => {
    if (options.banner !== false) printBanner();

    console.log(chalk.bold('  OpenClaw Agent Firewall Setup\n'));
    console.log(chalk.dim('  Generating OWASP LLM Top 10 security policy for your OpenClaw agent...\n'));

    const { generateOpenClawAF } = await import('./wizard');
    const today = new Date();
    const reviewDate = new Date(today);
    reviewDate.setFullYear(reviewDate.getFullYear() + 1);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const content = generateOpenClawAF(options.org, options.domain, formatDate(today), formatDate(reviewDate));
    const outPath = path.resolve(process.cwd(), options.output);

    if (fs.existsSync(outPath)) {
      console.log(chalk.yellow(`  ⚠ File already exists: ${outPath}`));
      console.log(chalk.dim('    Delete it first or use --output to specify a different path.'));
      process.exit(1);
    }

    fs.writeFileSync(outPath, content, 'utf8');

    // Count rules
    const ruleMatches = content.match(/^  - id:/gm);
    const ruleCount = ruleMatches ? ruleMatches.length : 0;

    console.log(chalk.green(`  ✓ Policy file created: ${outPath}`));
    console.log(chalk.dim(`  ✓ ${ruleCount} OWASP LLM security rules included`));
    console.log(chalk.dim('  ✓ Covers: LLM01 Prompt Injection, LLM02 Sensitive Data, LLM05 Output Handling,'));
    console.log(chalk.dim('            LLM08 Excessive Agency, LLM09 Overreliance, LLM03/07 Plugin Safety'));
    console.log('');
    console.log(chalk.bold('  Next steps:\n'));
    console.log(`  ${chalk.dim('1.')} Start the engine:  ${chalk.bold(`raigo-engine ${options.output}`)}`);
    console.log(`  ${chalk.dim('2.')} Add the skill:     Copy ${chalk.bold('skill/raigo/')} to ${chalk.bold('~/.openclaw/skills/raigo/')}`);
    console.log(`  ${chalk.dim('3.')} That\'s it.         Your OpenClaw agent is now protected.`);
    console.log('');
    console.log(chalk.dim(`  Skill & hook:   https://github.com/PericuloLimited/raigo/tree/main/integrations/openclaw`));
    console.log(chalk.dim('  Docs:           https://raigo.ai/docs/openclaw'));
    console.log('');
    console.log(chalk.dim('  ─────────────────────────────────────────────────────────────────'));
    console.log(chalk.dim('  Want a custom policy review for your organisation?'));
    console.log(chalk.dim('  Book a free 30-min AI Security Strategy Call:'));
    console.log(`  ${chalk.cyan.bold('https://meetings-eu1.hubspot.com/harrison-mussell/30-min-strategy-call')}`);
    console.log(chalk.dim('  ─────────────────────────────────────────────────────────────────'));
    console.log('');
  });

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init [name]')
  .description('Create a new .raigo policy file from a template')
  .option('-t, --template <template>', 'Template to use: general, healthcare, defence, startup', 'general')
  .option('-o, --output <file>', 'Output file path', 'policy.raigo')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action((name: string | undefined, options: any) => {
    if (options.banner !== false) printBanner();

    const validTemplates = ['general', 'healthcare', 'defence', 'startup'];
    if (!validTemplates.includes(options.template)) {
      console.error(chalk.red(`  ✗ Unknown template: ${options.template}`));
      console.log(chalk.dim(`    Available: ${validTemplates.join(', ')}`));
      process.exit(1);
    }

    const outPath = path.resolve(process.cwd(), options.output);
    if (fs.existsSync(outPath)) {
      console.error(chalk.red(`  ✗ File already exists: ${outPath}`));
      console.log(chalk.dim('    Use a different --output path or delete the existing file.'));
      process.exit(1);
    }

    const template = INIT_TEMPLATE(options.template, name || 'My Organisation');
    fs.writeFileSync(outPath, template, 'utf8');

    console.log(chalk.green(`  ✓ Created ${outPath}`));
    console.log(chalk.dim(`    Template: ${options.template}`));
    console.log(chalk.dim(`    Next step: edit the file, then run:`));
    console.log(chalk.bold(`\n    raigo compile ${options.output} --all\n`));
  });

// ── targets ───────────────────────────────────────────────────────────────────
program
  .command('targets')
  .description('List all supported compilation targets')
  .option('--no-banner', 'Suppress the RAIGO banner')
  .action((options: any) => {
    if (options.banner !== false) printBanner();

    const targets = [
      { name: 'n8n',        format: 'JSON',     desc: 'n8n workflow automation — policy rules + violation objects' },
      { name: 'microsoft',  format: 'JSON',     desc: 'Microsoft Copilot Studio — Declarative Agent + RAI Policy' },
      { name: 'claude',     format: 'XML',      desc: 'Anthropic Claude — structured XML system prompt with hooks' },
      { name: 'chatgpt',    format: 'Markdown', desc: 'OpenAI ChatGPT — first-person Custom Instructions' },
      { name: 'openclaw',   format: 'JSON',     desc: 'OpenClaw — gateway policy with hard_deny rules' },
      { name: 'lovable',    format: 'Markdown', desc: 'Lovable — structured Workspace Knowledge block' },
      { name: 'gemini',     format: 'JSON',     desc: 'Google Gemini / Vertex AI — system_instruction format' },
      { name: 'perplexity', format: 'Markdown', desc: 'Perplexity — Spaces system prompt format' },
      { name: 'audit',      format: 'Markdown', desc: 'Compliance audit summary with framework coverage' },
    ];

    console.log(chalk.bold('  Supported targets:\n'));
    targets.forEach(t => {
      console.log(`  ${chalk.hex('#6600FF').bold(t.name.padEnd(12))} ${chalk.dim(t.format.padEnd(10))} ${t.desc}`);
    });
    console.log('');
    console.log(chalk.dim('  Usage: raigo compile policy.raigo --target n8n,claude'));
    console.log(chalk.dim('         raigo compile policy.raigo --all'));
    console.log('');
  });

// ── version info ──────────────────────────────────────────────────────────────
program
  .command('info')
  .description('Show RAIGO version and environment information')
  .action(() => {
    printBanner();
    console.log(chalk.bold('  Version info:\n'));
    console.log(`  ${chalk.dim('RAIGO CLI:')}     ${pkg.version}`);
    console.log(`  ${chalk.dim('Node.js:')}       ${process.version}`);
    console.log(`  ${chalk.dim('Platform:')}      ${process.platform}`);
    console.log(`  ${chalk.dim('Homepage:')}      ${pkg.homepage}`);
    console.log(`  ${chalk.dim('Repository:')}    ${pkg.repository.url}`);
    console.log(`  ${chalk.dim('Support:')}       hello@periculo.co.uk`);
    console.log('');
  });

program.parse(process.argv);

// Show help if no command given
if (process.argv.length < 3) {
  printBanner();
  program.help();
}
