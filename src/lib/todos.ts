import { supabase } from "@/lib/supabase";
import type { Todo, TodoInput } from "@/types/todo";

const STORAGE_KEY = "voice-todo:items";

function readLocal(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Todo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: Todo[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function fetchTodos(userId: string | null): Promise<Todo[]> {
  if (!supabase) return readLocal();

  let query = supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as Todo[];
}

export async function createTodo(input: TodoInput, userId: string | null): Promise<Todo> {
  if (!supabase) {
    const item: Todo = {
      id: crypto.randomUUID(),
      user_id: userId,
      task: input.task,
      reminder_time: input.reminder_time,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    writeLocal([item, ...readLocal()]);
    return item;
  }

  const { data, error } = await supabase
    .from("todos")
    .insert([{ ...input, is_completed: false, user_id: userId }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Todo;
}

export async function setTodoCompleted(id: string, isCompleted: boolean): Promise<void> {
  if (!supabase) {
    writeLocal(
      readLocal().map((item) =>
        item.id === id ? { ...item, is_completed: isCompleted } : item,
      ),
    );
    return;
  }

  const { error } = await supabase
    .from("todos")
    .update({ is_completed: isCompleted })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTodo(id: string): Promise<void> {
  if (!supabase) {
    writeLocal(readLocal().filter((item) => item.id !== id));
    return;
  }

  const { error } = await supabase.from("todos").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
