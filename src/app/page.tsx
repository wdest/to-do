"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
  completed_at: string | null;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // PIN Lock check
    const unlocked = localStorage.getItem("is_unlocked");
    if (unlocked === "true" || !process.env.NEXT_PUBLIC_APP_PIN) {
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setTasks(data as Task[]);
    };

    fetchTasks();

    const subscription = supabase
      .channel("public:tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === payload.new.id);
              if (exists) return prev;
              return [payload.new as Task, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isUnlocked]);

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin === process.env.NEXT_PUBLIC_APP_PIN) {
      localStorage.setItem("is_unlocked", "true");
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle("");

    const tempId = crypto.randomUUID();
    const newTask: Task = {
      id: tempId,
      title,
      is_done: false,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    setTasks((prev) => [newTask, ...prev]);

    const { data, error } = await supabase
      .from("tasks")
      .insert([{ title, is_done: false }])
      .select()
      .single();

    if (error) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } else if (data) {
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? (data as Task) : t))
      );
    }
  };

  const toggleTask = async (task: Task) => {
    const newIsDone = !task.is_done;
    const newCompletedAt = newIsDone ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, is_done: newIsDone, completed_at: newCompletedAt }
          : t
      )
    );

    await supabase
      .from("tasks")
      .update({ is_done: newIsDone, completed_at: newCompletedAt })
      .eq("id", task.id);
  };

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const clearCompleted = async () => {
    const completedIds = tasks.filter((t) => t.is_done).map((t) => t.id);
    if (completedIds.length === 0) return;

    setTasks((prev) => prev.filter((t) => !t.is_done));
    await supabase.from("tasks").delete().in("id", completedIds);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={handlePinSubmit} className="max-w-xs w-full space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-medium text-zinc-100">Kilidi açın</h1>
            <p className="text-sm text-zinc-500 mt-1">Davam etmək üçün PIN kodu daxil edin</p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={`w-full bg-zinc-900 border ${
              pinError ? "border-red-500" : "border-zinc-800"
            } rounded-xl px-4 py-3 text-center text-2xl tracking-widest text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all`}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-zinc-100 text-zinc-950 font-medium rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
          >
            Daxil ol
          </button>
        </form>
      </div>
    );
  }

  const pendingTasks = tasks
    .filter((t) => !t.is_done)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const completedTasks = tasks
    .filter((t) => t.is_done)
    .sort((a, b) => {
      const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <main className="min-h-[100dvh] safe-area-pt safe-area-pb flex flex-col max-w-xl mx-auto selection:bg-zinc-800 relative">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-24 overflow-y-auto">
        
        {/* Pending Section */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">
            Etmədiklərim <span className="ml-1 opacity-70">({pendingTasks.length})</span>
          </h2>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task)}
                className="group flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 active:scale-[0.98] transition-all select-none cursor-pointer hover:border-zinc-700"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex-shrink-0" />
                  <span className="text-zinc-100 text-[15px] truncate">{task.title}</span>
                </div>
                <button
                  onClick={(e) => deleteTask(e, task.id)}
                  className="text-zinc-600 hover:text-red-400 p-2 -mr-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="text-center py-10 text-zinc-600 text-sm">
                Bütün tapşırıqlar tamamlanıb!
              </div>
            )}
          </div>
        </section>

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                Etdiklərim <span className="ml-1 opacity-70">({completedTasks.length})</span>
              </h2>
              <button
                onClick={clearCompleted}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
              >
                Təmizlə
              </button>
            </div>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  className="group flex items-center justify-between bg-zinc-900/30 border border-zinc-800/30 rounded-2xl p-4 active:scale-[0.98] transition-all select-none cursor-pointer opacity-60 hover:opacity-100"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-zinc-950 rounded-full" />
                    </div>
                    <span className="text-zinc-400 text-[15px] line-through truncate">
                      {task.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteTask(e, task.id)}
                    className="text-zinc-600 hover:text-red-400 p-2 -mr-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Quick Add Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pointer-events-none">
        <form
          onSubmit={addTask}
          className="max-w-xl mx-auto relative pointer-events-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Yeni tapşırıq..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-5 pr-14 py-[18px] text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all shadow-xl shadow-black/50"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-zinc-800 text-zinc-100 rounded-xl hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 transition-colors"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </main>
  );
}
