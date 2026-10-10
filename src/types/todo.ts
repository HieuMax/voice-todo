export interface Todo {
  id: string;
  user_id: string | null;
  task: string;
  reminder_time: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface ParsedTodo {
  task: string;
  time: string | null;
}

export type TodoInput = Pick<Todo, "task" | "reminder_time">;
