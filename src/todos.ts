import type { Todo } from './tools.js';
import { currentTodos } from './tools.js';

export function renderTodos(todos: Todo[]): string {
  return todos
    .map((t, i) => {
      const mark =
        t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '>' : ' ';
      return `[${mark}] ${i + 1}. ${t.content}`;
    })
    .join('\n');
}

export function todoLines(): string[] {
  const t = currentTodos();
  if (t.length === 0) return [];
  return renderTodos(t).split('\n');
}

export const SYSTEM_PROMPT = `You are anycode, an agentic coding assistant running in the user's terminal.

Mission: understand the user's request, investigate, make changes, and verify them.

How you work:
- Investigate before acting.
- Plan with todo_write for multi-step work.
- Prefer editing existing files; match style.
- Run and verify changes.
- bash/write/edit need approval.
`;
