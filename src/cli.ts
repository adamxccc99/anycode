#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { green, dim, yellow, red } from './ui.js';
import { resolveConfig, makeProvider, type CliFlags, type ResolvedConfig } from './config.js';
import { BUILTIN_TOOLS } from './tools.js';
import { SYSTEM_PROMPT, todoLines } from './todos.js';
import { runAgentLoop } from './loop.js';
import type { ChatMessage } from './types.js';

const history: ChatMessage[] = [];

function usage(): string {
  return `anycode - agentic coding CLI that works with any model\n\nUsage:\n  anycode [-p "prompt"] [--provider anthropic|openai] [--model NAME] [--base-url URL] [--yes]`;
}

export async function main(argv: string[]): Promise<void> {
  const args = argv;
  let flags: CliFlags & { prompt?: string; yes?: boolean } = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i++];
    if (a === '--help' || a === '-h') { console.log(usage()); process.exit(0); }
    if (a === '-p' || a === '--prompt') { flags.prompt = args[i++]; continue; }
    if (a === '--yes' || a === '-y') { flags.yes = true; continue; }
    if (a === '--provider') { flags.provider = args[i++] as any; continue; }
    if (a === '--model') { flags.model = args[i++]; continue; }
    if (a === '--base-url') { flags.baseUrl = args[i++]; continue; }
    if (a === '--profile') { flags.profile = args[i++]; continue; }
    if (a === '--max-tokens') { flags.maxTokens = Number(args[i++]); continue; }
    flags.prompt = a;
  }
  let cfg: ResolvedConfig;
  try { cfg = resolveConfig(flags); } catch (e) { console.error(red(String(e))); process.exit(2); }
  console.log(`${green('anycode')} ${dim(`· ${cfg.provider} · ${cfg.model}`)}`);
  const provider = makeProvider(cfg);
  
  if (flags.prompt) {
    const r = await runAgentLoop(history, flags.prompt, {
      provider, model: cfg.model, maxTokens: cfg.maxTokens,
      tools: BUILTIN_TOOLS, system: SYSTEM_PROMPT, cwd: process.cwd(),
      requestPermission: async () => !!flags.yes,
    });
    console.log('\n' + r.finalText);
    process.exit(0);
  }
  
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: green('› ') });
  rl.prompt();
  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === '/quit') { rl.close(); process.exit(0); }
    try {
      await runAgentLoop(history, input, {
        provider, model: cfg.model, maxTokens: cfg.maxTokens,
        tools: BUILTIN_TOOLS, system: SYSTEM_PROMPT, cwd: process.cwd(),
        requestPermission: async () => false,
        onText: (t) => process.stdout.write(t),
      });
      console.log('\n');
    } catch (e) { console.error(red(String(e))); }
    rl.prompt();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
}
