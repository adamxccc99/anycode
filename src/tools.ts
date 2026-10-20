// Built-in tools
import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export interface ToolContext {
  cwd: string;
  requestPermission: (tool: string, summary: string) => Promise<boolean>;
  onBashOutput?: (line: string) => void;
}

export interface ToolResult { output: string; isError?: boolean; }

export interface Tool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  safe: boolean;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

const MAX_OUTPUT = 30000;

function str(i: Record<string, unknown>, k: string): string {
  const v = i[k];
  if (typeof v !== 'string') throw new Error(`tool input "${k}" must be a string`);
  return v;
}
function optNum(i: Record<string, unknown>, k: string): number | undefined {
  const v = i[k]; return typeof v === 'number' ? v : undefined;
}
function optBool(i: Record<string, unknown>, k: string): boolean { return i[k] === true; }
function absPath(p: string, cwd: string): string { return isAbsolute(p) ? p : resolve(cwd, p); }
function clip(s: string, max = MAX_OUTPUT): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated ${s.length - max} chars]`;
}
function shq(s: string): string { return `'${s.replace(/'/g, `'\''`)}'`; }

export type Todo = { content: string; status: 'pending' | 'in_progress' | 'completed' };
const todoStore: { todos: Todo[] } = { todos: [] };

export function currentTodos(): Todo[] { return todoStore.todos; }

const todoWrite: Tool = {
  name: 'todo_write',
  description: 'Maintain task list.',
  schema: { type: 'object', properties: { todos: { type: 'array' } }, required: ['todos'] },
  safe: true,
  async run(input) {
    const todos = input['todos'] as Array<{content:string,status:Todo['status']}>;
    todoStore.todos = todos.map(t => ({ content: String(t.content), status: t.status }));
    const line = (t: Todo, i: number) => `${i+1}. [${t.status}] ${t.content}`;
    return { output: todoStore.todos.map(line).join('\n') };
  },
};

export const BUILTIN_TOOLS: Tool[] = [todoWrite];
