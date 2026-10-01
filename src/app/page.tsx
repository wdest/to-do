"use client";

import { useEffect, useState, FormEvent, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Check, Trash2, X, Lock, 
  RotateCcw, Calendar, Clock 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Task = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
  completed_at: string | null;
};

// Lake Geometry Constants
export const dynamic = "force-dynamic";

const LAKE_INTERNAL_RADIUS = 152;
const APP_PIN = process.env.NEXT_PUBLIC_APP_PIN || "1234";

// Deterministic hash for natural floating frequency and delay
function getTaskHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Stable Slot Coordinates using natural Phyllotaxis (Golden Spiral)
const getSlotCoordinate = (slotIndex: number, totalInLake: number) => {
  if (slotIndex === 0 && totalInLake === 1) return { x: 0, y: 0 };
  
  const goldenAngle = 2.399963229728653; // ~137.508 degrees
  const angle = slotIndex * goldenAngle;
  
  // Natural dispersion
  const spreadFactor = totalInLake <= 4 ? 0.58 : totalInLake <= 8 ? 0.68 : 0.76;
  const normalizedR = Math.min(spreadFactor, Math.sqrt((slotIndex + 0.45) / Math.max(totalInLake, 6)));
  const r = normalizedR * LAKE_INTERNAL_RADIUS;

  return {
    x: Math.round(Math.cos(angle) * r),
    y: Math.round(Math.sin(angle) * r),
  };
};

// Plant Sizing: smoothly scales down as count grows
const getPlantSize = (count: number) => {
  if (count <= 1) return 110;
  if (count <= 3) return 96;
  if (count <= 6) return 82;
  if (count <= 10) return 68;
  if (count <= 16) return 56;
  return 46;
};

// Realistic Botanical Water Lily (Nilufər) SVG Component
interface LilyPadProps {
  size: number;
  isDone: boolean;
  ageDays: number;
  title: string;
  seed: number;
}

const BotanicalLilyPad = ({ size, isDone, ageDays, title, seed }: LilyPadProps) => {
  const gradientId = `pad-grad-${isDone ? "done" : "pend"}-${seed % 100}`;
  
  // Botanical color tones
  let leafGradStart = "#e11d48"; // Vivid crimson
  let leafGradMid = "#9f1239";   // Deep ruby
  let leafGradEnd = "#4c0519";   // Dark wine
  let leafRim = "rgba(254, 205, 211, 0.4)";
  let primaryVein = "rgba(255, 228, 230, 0.45)";
  let secondaryVein = "rgba(255, 228, 230, 0.22)";

  if (isDone) {
    if (ageDays < 2) {
      // Day 0-2: Lush blooming emerald
      leafGradStart = "#10b981";
      leafGradMid = "#047857";
      leafGradEnd = "#064e3b";
      leafRim = "rgba(167, 243, 208, 0.45)";
      primaryVein = "rgba(209, 250, 229, 0.5)";
      secondaryVein = "rgba(209, 250, 229, 0.25)";
    } else if (ageDays < 4) {
      // Day 2-4: Olive chartreuse
      leafGradStart = "#84cc16";
      leafGradMid = "#4d7c0f";
      leafGradEnd = "#365314";
      leafRim = "rgba(217, 249, 157, 0.4)";
      primaryVein = "rgba(236, 252, 203, 0.45)";
      secondaryVein = "rgba(236, 252, 203, 0.22)";
    } else if (ageDays < 6) {
      // Day 4-6: Autumn amber
      leafGradStart = "#f59e0b";
      leafGradMid = "#b45309";
      leafGradEnd = "#78350f";
      leafRim = "rgba(253, 230, 138, 0.35)";
      primaryVein = "rgba(254, 243, 199, 0.4)";
      secondaryVein = "rgba(254, 243, 199, 0.2)";
    } else {
      // Day 6-7: Sunken withered brown
      leafGradStart = "#78716c";
      leafGradMid = "#44403c";
      leafGradEnd = "#1c1917";
      leafRim = "rgba(214, 211, 209, 0.25)";
      primaryVein = "rgba(231, 229, 228, 0.3)";
      secondaryVein = "rgba(231, 229, 228, 0.15)";
    }
  }

  // Slight natural leaf notch orientation
  const notchRotation = (seed * 47) % 360;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* 3D Aquatic Water Shadow */}
      <div 
        className="absolute inset-0 rounded-full blur-md transform scale-95 translate-y-2 opacity-75 pointer-events-none"
        style={{
          background: isDone 
            ? "radial-gradient(circle, rgba(1, 28, 20, 0.9) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(28, 3, 11, 0.9) 0%, transparent 70%)"
        }}
      />

      {/* SVG Botanical Leaf Blade */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
        style={{ transform: `rotate(${notchRotation}deg)` }}
      >
        <defs>
          <radialGradient id={gradientId} cx="48%" cy="48%" r="52%">
            <stop offset="0%" stopColor={leafGradStart} />
            <stop offset="55%" stopColor={leafGradMid} />
            <stop offset="92%" stopColor={leafGradEnd} />
            <stop offset="100%" stopColor="#050505" stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Natural Organic Lily Pad with V-Cleft Notch */}
        <path
          d="M 50 12 
             C 73 11, 90 27, 90 50 
             C 90 73, 73 90, 50 90 
             C 27 90, 10 73, 10 50 
             C 10 27, 27 11, 48 12 
             L 50 49 Z"
          fill={`url(#${gradientId})`}
          stroke={leafRim}
          strokeWidth="1.2"
        />

        {/* Radiating Primary Veins */}
        <path d="M 50 49 Q 67 36 82 25" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 76 48 87 50" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 73 70 80 81" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 50 75 49 88" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 27 70 20 81" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 24 48 13 50" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M 50 49 Q 33 33 21 25" stroke={primaryVein} strokeWidth="1.1" strokeLinecap="round" fill="none" />

        {/* Secondary Delicate Veins */}
        <path d="M 64 39 Q 73 34 78 30" stroke={secondaryVein} strokeWidth="0.7" fill="none" />
        <path d="M 68 56 Q 77 60 81 66" stroke={secondaryVein} strokeWidth="0.7" fill="none" />
        <path d="M 40 68 Q 32 74 27 78" stroke={secondaryVein} strokeWidth="0.7" fill="none" />
        <path d="M 32 53 Q 24 57 19 62" stroke={secondaryVein} strokeWidth="0.7" fill="none" />

        {/* Glistening Morning Dew Droplet with Crescent Specular Highlight */}
        <ellipse cx="36" cy="38" rx="4.5" ry="3.5" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        <ellipse cx="34.8" cy="36.8" rx="1.5" ry="1" fill="#ffffff" opacity="0.9" />
        <path d="M 34 40.5 Q 36 41.5 38 40.5" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" fill="none" />

        {/* Center Accent: Blooming Lotus Flower (Completed) or Glowing Ruby Core (Pending) */}
        {isDone ? (
          <g transform="translate(50, 49) scale(0.38)">
            <circle cx="0" cy="0" r="16" fill="#f472b6" opacity="0.35" />
            <path d="M 0 0 C -5 -18, 5 -18, 0 0" fill="#ffffff" stroke="#fbcfe8" strokeWidth="1.2" />
            <path d="M 0 0 C 18 -5, 18 5, 0 0" fill="#ffffff" stroke="#fbcfe8" strokeWidth="1.2" />
            <path d="M 0 0 C 5 18, -5 18, 0 0" fill="#ffffff" stroke="#fbcfe8" strokeWidth="1.2" />
            <path d="M 0 0 C -18 5, -18 -5, 0 0" fill="#ffffff" stroke="#fbcfe8" strokeWidth="1.2" />
            <path d="M 0 0 C 12 -12, 16 -8, 0 0" fill="#fdf2f8" stroke="#f472b6" strokeWidth="1" />
            <path d="M 0 0 C 12 12, 8 16, 0 0" fill="#fdf2f8" stroke="#f472b6" strokeWidth="1" />
            <path d="M 0 0 C -12 12, -16 8, 0 0" fill="#fdf2f8" stroke="#f472b6" strokeWidth="1" />
            <path d="M 0 0 C -12 -12, -8 -16, 0 0" fill="#fdf2f8" stroke="#f472b6" strokeWidth="1" />
            <circle cx="0" cy="0" r="4.8" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
          </g>
        ) : (
          <g transform="translate(50, 49)">
            <circle cx="0" cy="0" r="6" fill="#f43f5e" opacity="0.85" />
            <circle cx="0" cy="0" r="3" fill="#ffe4e6" />
          </g>
        )}
      </svg>

      {/* HORIZONTAL CRISP TEXT */}
      <div className="absolute inset-0 flex items-center justify-center p-2 z-20 pointer-events-auto">
        {isDone ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)] mb-0.5">
              <Check size={12} className="text-emerald-300" strokeWidth={3} />
            </div>
            {size >= 62 && (
              <span className="text-[10px] text-emerald-200 font-medium px-1 max-w-[86px] line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                {title}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-1 text-center w-full">
            <span 
              className="text-rose-200 font-bold leading-tight drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] line-clamp-2 max-w-[90%]"
              style={{ fontSize: Math.max(9, Math.min(13, size / 5.2)) }}
            >
              {title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  
  // Security PIN
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // STABLE SLOT MAPS: plants stay pinned to their slots and NEVER jump when new tasks arrive!
  const pendingSlotMapRef = useRef<Map<string, number>>(new Map());
  const completedSlotMapRef = useRef<Map<string, number>>(new Map());

  // 1. PIN verification
  useEffect(() => {
    const unlocked = localStorage.getItem("is_unlocked");
    if (unlocked === "true" || !process.env.NEXT_PUBLIC_APP_PIN) {
      setIsUnlocked(true);
    }
  }, []);

  // 2. Fetch Tasks & Supabase Realtime
  useEffect(() => {
    if (!isUnlocked) return;
    
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        let loaded = data as Task[];
        
        // 1-Week Decay Auto-cleanup
        const now = Date.now();
        const toDeleteIds: string[] = [];
        loaded = loaded.filter((t) => {
          if (!t.is_done || !t.completed_at) return true;
          const ageDays = (now - new Date(t.completed_at).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays >= 7) {
            toDeleteIds.push(t.id);
            return false;
          }
          return true;
        });

        if (toDeleteIds.length > 0) {
          supabase.from("tasks").delete().in("id", toDeleteIds).then();
        }

        setTasks(loaded);
      }
    };

    fetchTasks();

    const channel = supabase
      .channel("realtime:tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => {
            if (prev.some((t) => t.id === payload.new.id)) return prev;
            return [payload.new as Task, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t)));
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isUnlocked]);

  // Handle PIN Unlock
  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin === APP_PIN) {
      localStorage.setItem("is_unlocked", "true");
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  // Add Task
  const addTask = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    setNewTaskTitle("");
    setIsAdding(false);

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
      setTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
    }
  };

  // Toggle Task Status (Move between lakes)
  const toggleTask = async (task: Task) => {
    const nextDone = !task.is_done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;

    if (nextDone) {
      pendingSlotMapRef.current.delete(task.id);
    } else {
      completedSlotMapRef.current.delete(task.id);
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, is_done: nextDone, completed_at: nextCompletedAt } : t
      )
    );

    await supabase
      .from("tasks")
      .update({ is_done: nextDone, completed_at: nextCompletedAt })
      .eq("id", task.id);
  };

  // Delete Task
  const deleteTask = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    pendingSlotMapRef.current.delete(id);
    completedSlotMapRef.current.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  // Direct Click on Left Lake Surface to Create Task
  const handleLeftLakeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".lily-pad-wrapper")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setClickRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setClickRipple(null), 1000);
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // Separate tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => !t.is_done);
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.is_done);
  }, [tasks]);

  // STABLE SLOT ALLOCATION: Assign slots in deterministic order so existing plants NEVER jump!
  const pendingTaskSlots = useMemo(() => {
    const map = pendingSlotMapRef.current;
    const activeIds = new Set(pendingTasks.map((t) => t.id));

    for (const id of Array.from(map.keys())) {
      if (!activeIds.has(id)) map.delete(id);
    }

    const usedSlots = new Set<number>(map.values());

    const sorted = [...pendingTasks].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const t of sorted) {
      if (!map.has(t.id)) {
        let s = 0;
        while (usedSlots.has(s)) s++;
        map.set(t.id, s);
        usedSlots.add(s);
      }
    }

    return pendingTasks.map((t) => {
      const slot = map.get(t.id) ?? 0;
      const coord = getSlotCoordinate(slot, pendingTasks.length);
      const hash = getTaskHash(t.id);
      return { task: t, slot, coord, hash };
    });
  }, [pendingTasks]);

  const completedTaskSlots = useMemo(() => {
    const map = completedSlotMapRef.current;
    const activeIds = new Set(completedTasks.map((t) => t.id));

    for (const id of Array.from(map.keys())) {
      if (!activeIds.has(id)) map.delete(id);
    }

    const usedSlots = new Set<number>(map.values());

    const sorted = [...completedTasks].sort(
      (a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime()
    );

    for (const t of sorted) {
      if (!map.has(t.id)) {
        let s = 0;
        while (usedSlots.has(s)) s++;
        map.set(t.id, s);
        usedSlots.add(s);
      }
    }

    return completedTasks.map((t) => {
      const slot = map.get(t.id) ?? 0;
      const coord = getSlotCoordinate(slot, completedTasks.length);
      const hash = getTaskHash(t.id);
      const ageDays = t.completed_at 
        ? (Date.now() - new Date(t.completed_at).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      return { task: t, slot, coord, hash, ageDays };
    });
  }, [completedTasks]);

  const pendingPlantSize = getPlantSize(pendingTasks.length);
  const completedPlantSize = getPlantSize(completedTasks.length);

  // Locked Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#030712]">
        <motion.form 
          initial={{ opacity: 0, scale: 0.94 }} 
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handlePinSubmit} 
          className="relative overflow-hidden rounded-[2rem] p-8 max-w-xs w-full bg-slate-900/80 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl space-y-6 text-center"
        >
          <div className="relative z-10 flex justify-center">
            <Lock className="text-slate-400" size={28} strokeWidth={1.5} />
          </div>

          <input
            type="password" 
            inputMode="numeric" 
            pattern="[0-9]*" 
            maxLength={4}
            value={pin} 
            onChange={(e) => setPin(e.target.value)}
            className={`w-full bg-black/40 border-b-2 ${pinError ? "border-rose-500" : "border-white/20"} px-4 py-3 text-center text-3xl tracking-[0.4em] text-white focus:outline-none focus:border-cyan-400 transition-colors font-light`}
            autoFocus
          />
        </motion.form>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] safe-area-pt safe-area-pb p-4 md:p-8 flex flex-col max-w-6xl mx-auto overflow-hidden relative">
      
      {/* Ambient Fireflies in Night Forest */}
      <div className="firefly bg-cyan-300 top-[15%] left-[20%] shadow-[0_0_10px_#67e8f9]" />
      <div className="firefly bg-rose-400 top-[35%] left-[12%] shadow-[0_0_10px_#fb7185]" />
      <div className="firefly bg-emerald-400 top-[28%] right-[18%] shadow-[0_0_10px_#34d399]" />
      <div className="firefly bg-amber-300 top-[65%] right-[25%] shadow-[0_0_10px_#fcd34d]" />
      <div className="firefly bg-cyan-200 bottom-[20%] left-[30%] shadow-[0_0_10px_#a5f3fc]" />

      {/* MINIMAL TOP ACTION BAR */}
      <header className="flex items-center justify-end mb-4 px-3 z-30 min-h-[48px]">
        <AnimatePresence mode="wait">
          {!isAdding ? (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setIsAdding(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="p-3 bg-white/5 hover:bg-white/10 text-rose-300 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all"
              title="Yeni tapşırıq"
            >
              <Plus size={20} />
            </motion.button>
          ) : (
            <motion.form
              key="add-form"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onSubmit={addTask}
              className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-full p-1.5 pl-4 shadow-[0_0_25px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <input
                ref={inputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Yazın..."
                className="bg-transparent text-white placeholder:text-white/30 focus:outline-none w-48 md:w-72 text-sm font-light"
              />
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-full"
              >
                <X size={16} />
              </button>
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="p-1.5 bg-rose-500/40 text-rose-100 rounded-full hover:bg-rose-500/60 transition-colors disabled:opacity-20"
              >
                <Check size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* TWO NATURAL LAKES MAIN STAGE */}
      <div className="flex-1 flex flex-col md:flex-row gap-8 lg:gap-14 items-center justify-center relative w-full h-full my-auto pb-6">
        
        {/* LEFT LAKE: MYSTIC CRIMSON POND (Pending Tasks) */}
        <div className="flex flex-col items-center w-full max-w-[440px]">
          {/* Natural Organic Water Reservoir */}
          <div 
            onClick={handleLeftLakeClick}
            className="w-[330px] h-[330px] sm:w-[380px] sm:h-[380px] md:w-[430px] md:h-[430px] lake-left-shape pond-crimson relative cursor-pointer overflow-hidden transition-all duration-300"
            title="Klikləyərək yeni tapşırıq əlavə edin"
          >
            {/* Organic Shoreline Rim with River Pebbles */}
            <div className="lake-shoreline" />

            {/* Shallow Translucent Water Rim */}
            <div className="shallow-water-lip" />

            {/* Shimmering Refractive Water Caustics */}
            <div className="water-caustics-layer" />

            {/* Natural Gentle Surface Wave */}
            <div className="water-surface-ripple" />

            {/* Direct Click Ripple Wave */}
            {clickRipple && (
              <motion.div
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute rounded-full border-2 border-rose-400 pointer-events-none z-10"
                style={{
                  left: clickRipple.x - 20,
                  top: clickRipple.y - 20,
                  width: 40,
                  height: 40,
                }}
              />
            )}

            {/* Floating Water Lily Pads (Zero Movement Bugs!) */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <AnimatePresence>
                {pendingTaskSlots.map(({ task, coord, hash }) => {
                  const floatDuration = 4.5 + (hash % 20) * 0.1;
                  const floatDelay = (hash % 15) * 0.1;

                  return (
                    <motion.div
                      key={task.id}
                      className="absolute left-1/2 top-1/2 lily-pad-wrapper pointer-events-auto cursor-pointer"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: coord.x,
                        y: coord.y,
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 140,
                        damping: 20,
                        mass: 0.8,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      whileHover={{ scale: 1.12, zIndex: 30 }}
                      whileTap={{ scale: 0.94 }}
                    >
                      {/* Sizing Container: smoothly transitions size in-place */}
                      <div
                        style={{
                          width: pendingPlantSize,
                          height: pendingPlantSize,
                          marginLeft: -pendingPlantSize / 2,
                          marginTop: -pendingPlantSize / 2,
                          transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1), height 0.5s cubic-bezier(0.16, 1, 0.3, 1), margin 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        {/* Independent Water Buoyancy Floating Bobbing */}
                        <motion.div
                          animate={{
                            y: [-2.5, 2.5, -2.5],
                            rotate: [-1.5, 1.5, -1.5],
                          }}
                          transition={{
                            duration: floatDuration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: floatDelay,
                          }}
                          className="w-full h-full"
                        >
                          <BotanicalLilyPad
                            size={pendingPlantSize}
                            isDone={false}
                            ageDays={0}
                            title={task.title}
                            seed={hash}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT LAKE: EMERALD SERENITY POND (Completed Tasks with Decay) */}
        <div className="flex flex-col items-center w-full max-w-[440px]">
          {/* Natural Organic Water Reservoir */}
          <div 
            className="w-[330px] h-[330px] sm:w-[380px] sm:h-[380px] md:w-[430px] md:h-[430px] lake-right-shape pond-emerald relative overflow-hidden transition-all duration-300"
          >
            {/* Organic Shoreline Rim with River Pebbles */}
            <div className="lake-shoreline" />

            {/* Shallow Translucent Water Rim */}
            <div className="shallow-water-lip" />

            {/* Shimmering Refractive Water Caustics */}
            <div className="water-caustics-layer" />

            {/* Natural Gentle Surface Wave */}
            <div className="water-surface-ripple" />

            {/* Completed Floating Water Lilies */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <AnimatePresence>
                {completedTaskSlots.map(({ task, coord, hash, ageDays }) => {
                  const floatDuration = 4.8 + (hash % 20) * 0.1;
                  const floatDelay = (hash % 15) * 0.1;

                  return (
                    <motion.div
                      key={task.id}
                      className="absolute left-1/2 top-1/2 lily-pad-wrapper pointer-events-auto cursor-pointer"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: coord.x,
                        y: coord.y,
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 140,
                        damping: 20,
                        mass: 0.8,
                      }}
                      onClick={() => setSelectedTask(task)}
                      whileHover={{ scale: 1.12, zIndex: 30 }}
                      whileTap={{ scale: 0.94 }}
                    >
                      {/* Sizing Container: smoothly transitions size in-place */}
                      <div
                        style={{
                          width: completedPlantSize,
                          height: completedPlantSize,
                          marginLeft: -completedPlantSize / 2,
                          marginTop: -completedPlantSize / 2,
                          transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1), height 0.5s cubic-bezier(0.16, 1, 0.3, 1), margin 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        {/* Independent Water Buoyancy Floating Bobbing */}
                        <motion.div
                          animate={{
                            y: [-2.5, 2.5, -2.5],
                            rotate: [-1.5, 1.5, -1.5],
                          }}
                          transition={{
                            duration: floatDuration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: floatDelay,
                          }}
                          className="w-full h-full"
                        >
                          <BotanicalLilyPad
                            size={completedPlantSize}
                            isDone={true}
                            ageDays={ageDays}
                            title={task.title}
                            seed={hash}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED INSPECTION MODAL */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-md w-full rounded-3xl p-6 md:p-8 shadow-2xl relative border ${
                selectedTask.is_done
                  ? "bg-slate-950/90 border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.2)]"
                  : "bg-slate-950/90 border-rose-500/30 shadow-[0_0_60px_rgba(225,29,72,0.2)]"
              }`}
            >
              {/* Header Close */}
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Task Title */}
              <h3 
                className={`text-xl md:text-2xl font-light leading-relaxed mb-6 ${
                  selectedTask.is_done ? "text-emerald-100" : "text-rose-100 font-normal"
                }`}
              >
                {selectedTask.title}
              </h3>

              {/* Timestamp Metadata */}
              <div className="space-y-2 mb-8 bg-black/40 rounded-2xl p-4 border border-white/5 text-xs text-slate-300 font-light">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{new Date(selectedTask.created_at).toLocaleString("az-AZ")}</span>
                </div>

                {selectedTask.completed_at && (
                  <div className="flex items-center gap-2 text-emerald-300/80">
                    <Clock size={14} />
                    <span>{new Date(selectedTask.completed_at).toLocaleString("az-AZ")}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    deleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="px-4 py-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-2xl border border-red-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 size={16} /> Sil
                </button>

                <div className="flex items-center gap-2">
                  {!selectedTask.is_done ? (
                    <button
                      onClick={() => {
                        toggleTask(selectedTask);
                        setSelectedTask(null);
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <Check size={18} strokeWidth={2.5} /> Bitirdim
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        toggleTask(selectedTask);
                        setSelectedTask(null);
                      }}
                      className="px-6 py-3 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 rounded-2xl border border-rose-500/30 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <RotateCcw size={16} /> Geri Qaytar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
