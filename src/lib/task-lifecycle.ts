export const DAY_MS = 24 * 60 * 60 * 1000;
export const TASK_LIFETIME_MS = 2 * DAY_MS;
export const MAX_POND_LILIES = 12;
export const TASK_PAGE_SIZE = 20;

type CompletedTask = { is_done: boolean; completed_at: string | null };

export function completedAgeDays(task: CompletedTask, now: number): number {
  if (!task.is_done || !task.completed_at) return 0;
  const completed = Date.parse(task.completed_at);
  return Number.isFinite(completed) ? Math.max(0, (now - completed) / DAY_MS) : 0;
}

export function isTaskExpired(task: CompletedTask, now: number): boolean {
  return completedAgeDays(task, now) * DAY_MS >= TASK_LIFETIME_MS;
}

export function lilyOpacity(ageDays: number): number {
  // Stay bright for the first 24 hours, then fade until the 48-hour expiry.
  const lifetimeDays = TASK_LIFETIME_MS / DAY_MS;
  return Math.max(0, Math.min(1, (lifetimeDays - ageDays) / (lifetimeDays - 1)));
}

export function taskPage<T>(tasks: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(tasks.length / TASK_PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  return { page, pageCount, items: tasks.slice(page * TASK_PAGE_SIZE, (page + 1) * TASK_PAGE_SIZE) };
}
