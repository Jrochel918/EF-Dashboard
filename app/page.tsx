'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Plus, CheckCircle2, Circle, ChevronRight, X, Trash2, Star,
  TrendingUp, ArrowLeft, Timer, Scissors, Smile, FileText,
  Heart, Target, ChevronDown, Play, Pause, RotateCcw, Pencil, CalendarPlus,
} from 'lucide-react';
import { EditorialShell, DESIGN_THEMES, DesignTheme } from '../design-system';

// ── Types ──────────────────────────────────────────────────────────────────────

type EFKey = 'taskInitiation' | 'workingMemory' | 'timeManagement';

const EF_AREAS: { key: EFKey; label: string; color: string; bg: string }[] = [
  { key: 'taskInitiation', label: 'Getting Started', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'workingMemory', label: 'Focus & Memory', color: '#0369a1', bg: '#f0f9ff' },
  { key: 'timeManagement', label: 'Managing Time', color: '#047857', bg: '#f0fdf4' },
];

const EF_LEVEL_LABELS: Record<number, string> = {
  1: 'Beginning', 2: 'Developing', 3: 'Progressing',
  4: 'Proficient', 5: 'Mastery',
};

const AVATAR_COLORS: [string, string][] = [
  ['#7c3aed', '#ddd6fe'], ['#0369a1', '#bae6fd'], ['#047857', '#bbf7d0'],
  ['#b45309', '#fde68a'], ['#be185d', '#fce7f3'], ['#1d4ed8', '#bfdbfe'],
];

type Task = { id: string; text: string; completed: boolean };
type Session = { id: string; studentId: string; date: string; efRatings: Record<EFKey, number>; tasks: Task[]; notes: string };
type Student = { id: string; name: string; grade: string };
type Habit = { id: string; studentId: string; text: string };
type WeekGoal = { id: string; text: string; completed: boolean };
type WeekEntry = { id: string; studentId: string; weekStart: string; goals: WeekGoal[]; habitChecks: string[]; planNotes: string };
type Obligation = { id: string; studentId: string; weekStart: string; text: string; plannedDate: string; plannedTime: string; completed: boolean };
type WidgetType = 'mood' | 'braindump' | 'gratitude' | 'personal-goal' | null;
type ChunkStep = { id: string; text: string; done: boolean };
type ChunkProject = { id: string; studentId: string; name: string; dueDate: string; steps: ChunkStep[] };
type MoodEntry = { date: string; level: number; note: string };
type ThemePreset = 'minimal' | 'bold' | 'cozy' | 'dark' | 'creative' | 'structured';
type ThemeLayout = 'sidebar' | 'header';
type StudentTheme = {
  preset: ThemePreset;
  layout: ThemeLayout;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  cardBg: string;
  tagline: string;
  vibe: string;
  darkMode: boolean;
};

const PRESET_CONFIGS: Record<ThemePreset, {
  label: string; desc: string; swatch: string;
  cardRadius: string; buttonRadius: string; avatarRadius: string;
  shadow: string; tabStyle: 'underline' | 'pill'; sidebarAccent: boolean;
  defaultLayout: ThemeLayout;
}> = {
  minimal:    { label: 'Minimal',    desc: 'Clean & focused',      swatch: '#f5f5f4', cardRadius: '12px',  buttonRadius: '8px',  avatarRadius: '14px', shadow: 'none',                              tabStyle: 'underline', sidebarAccent: false, defaultLayout: 'sidebar' },
  bold:       { label: 'Bold',       desc: 'Strong & confident',   swatch: '#1e293b', cardRadius: '8px',   buttonRadius: '6px',  avatarRadius: '8px',  shadow: '0 6px 20px rgba(0,0,0,0.15)',       tabStyle: 'underline', sidebarAccent: true,  defaultLayout: 'header'  },
  cozy:       { label: 'Cozy',       desc: 'Warm & inviting',      swatch: '#fef3c7', cardRadius: '24px',  buttonRadius: '24px', avatarRadius: '28px', shadow: '0 2px 20px rgba(0,0,0,0.06)',       tabStyle: 'pill',      sidebarAccent: false, defaultLayout: 'sidebar' },
  dark:       { label: 'Dark',       desc: 'Sleek & modern',       swatch: '#0f172a', cardRadius: '16px',  buttonRadius: '12px', avatarRadius: '16px', shadow: '0 4px 24px rgba(0,0,0,0.5)',        tabStyle: 'pill',      sidebarAccent: true,  defaultLayout: 'sidebar' },
  creative:   { label: 'Creative',   desc: 'Bold & expressive',    swatch: '#fdf4ff', cardRadius: '20px',  buttonRadius: '20px', avatarRadius: '50%',  shadow: '0 4px 16px rgba(0,0,0,0.10)',       tabStyle: 'pill',      sidebarAccent: true,  defaultLayout: 'header'  },
  structured: { label: 'Structured', desc: 'Organized & clear',    swatch: '#f8fafc', cardRadius: '6px',   buttonRadius: '4px',  avatarRadius: '8px',  shadow: '0 1px 4px rgba(0,0,0,0.08)',        tabStyle: 'underline', sidebarAccent: false, defaultLayout: 'sidebar' },
};

function getThemeStyles(theme: StudentTheme | null, avatarFg: string, avatarBg: string) {
  const p = theme ? (PRESET_CONFIGS[theme.preset] ?? PRESET_CONFIGS.minimal) : PRESET_CONFIGS.minimal;
  const isDark = theme?.darkMode ?? false;
  const primary = theme?.primaryColor ?? avatarFg;
  const bg = theme?.bgColor ?? (isDark ? '#0f172a' : '#faf9f8');
  const cardBg = theme?.cardBg ?? (isDark ? '#1e293b' : '#ffffff');
  return {
    primary, bg, cardBg,
    textPrimary:   isDark ? '#f1f5f9' : '#1c1917',
    textSecondary: isDark ? '#94a3b8' : '#78716c',
    textMuted:     isDark ? '#64748b' : '#a8a29e',
    cardRadius: p.cardRadius, buttonRadius: p.buttonRadius, avatarRadius: p.avatarRadius,
    cardShadow: p.shadow,
    cardBorder: isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${primary}18`,
    sidebarBg:     p.sidebarAccent ? (isDark ? '#020617' : `${primary}10`) : (isDark ? '#0f172a' : '#ffffff'),
    sidebarBorder: isDark ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${primary}18`,
    tabStyle: p.tabStyle, isDark,
    preset: (theme?.preset ?? 'minimal') as ThemePreset,
    layout: (theme?.layout ?? 'sidebar') as ThemeLayout,
  };
}

// ── Date helpers ───────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedText — Goodman-style letter-by-letter stagger on mount / key change
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedText({
  text,
  animKey,
  className = '',
  style = {},
  stagger = 28,
  delay = 0,
}: {
  text: string;
  animKey?: string | number;
  className?: string;
  style?: React.CSSProperties;
  stagger?: number;
  delay?: number;
}) {
  const [revision, setRevision] = React.useState(0);
  const prevKey = React.useRef<string | number | undefined>(animKey);
  if (prevKey.current !== animKey) { prevKey.current = animKey; setRevision(r => r + 1); }

  return (
    <span className={className} style={{ display: 'inline-block', ...style }} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span
          key={`${revision}-${i}`}
          aria-hidden
          style={{
            display: 'inline-block',
            whiteSpace: ch === ' ' ? 'pre' : undefined,
            animation: `gdLetterIn 0.55s cubic-bezier(0.22,1,0.36,1) both`,
            animationDelay: `${delay + i * stagger}ms`,
          }}>
          {ch}
        </span>
      ))}
      <style>{`
        @keyframes gdLetterIn {
          from { opacity: 0; transform: translateY(0.35em) scaleY(0.8); }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
      `}</style>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useCursor — custom cursor that morphs on hover
// ─────────────────────────────────────────────────────────────────────────────
function useCursor() {
  const [pos, setPos] = React.useState({ x: -100, y: -100 });
  const [hovering, setHovering] = React.useState(false);
  const raf = React.useRef<number>(0);
  const target = React.useRef({ x: -100, y: -100 });
  const current = React.useRef({ x: -100, y: -100 });

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => { target.current = { x: e.clientX, y: e.clientY }; };
    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      setHovering(!!(el.closest('button') || el.closest('a') || el.closest('input')));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);

    const loop = () => {
      const ease = 0.22;
      current.current.x += (target.current.x - current.current.x) * ease;
      current.current.y += (target.current.y - current.current.y) * ease;
      setPos({ x: current.current.x, y: current.current.y });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return { pos, hovering };
}

// ─────────────────────────────────────────────────────────────────────────────
// RosterTile — Goodman Gallery–style full-width typographic row
// ─────────────────────────────────────────────────────────────────────────────
function RosterTile({
  student, onClick,
}: {
  student: Student;
  onClick: () => void;
}) {
  const [hoverCount, setHoverCount] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%',
        padding: '22px 0',
        backgroundColor: isHovered ? '#000000' : '#ffffff',
        border: 'none',
        borderTop: '1px solid #000000',
        cursor: 'none',
        textAlign: 'left',
        transition: 'background-color 280ms cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={() => { setIsHovered(true); setHoverCount(c => c + 1); }}
      onMouseLeave={() => setIsHovered(false)}>
      {/* Name */}
      <span style={{
        fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: '-0.025em',
        color: isHovered ? '#ffffff' : '#000000',
        transition: 'color 280ms cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
      }}>
        <AnimatedText text={student.name} animKey={hoverCount} stagger={18} />
      </span>
      {/* Grade — right side */}
      {student.grade && (
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isHovered ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
          transition: 'color 280ms cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          marginLeft: '2rem',
        }}>
          {student.grade}
        </span>
      )}
    </button>
  );
}

function getMonday(date: Date): Date {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0, 0, 0, 0); return d;
}
function weekStartISO(weeksAgo = 0): string {
  const m = getMonday(new Date()); m.setDate(m.getDate() - weeksAgo * 7); return m.toISOString().slice(0, 10);
}
function weekLabel(ws: string): string {
  const s = new Date(ws + 'T12:00:00'), e = new Date(s); e.setDate(e.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${f(s)} – ${f(e)}`;
}
function prevWeekStart(ws: string): string {
  const d = new Date(ws + 'T12:00:00'); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
}
function fmtDate(s: string) { return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtDateLong(s: string) { return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }); }
function getAvatarColors(name: string): [string, string] { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function googleCalendarUrl(text: string, date: string, time: string): string {
  if (!date) return '';
  const d = date.replace(/-/g, '');
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${d}T${pad(h)}${pad(m)}00`;
    const end = `${d}T${pad(h + 1)}${pad(m)}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${start}/${end}`;
  }
  const nextDay = new Date(date + 'T12:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const endD = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${d}/${endD}`;
}

// ── Seed data ──────────────────────────────────────────────────────────────────

const SEED_STUDENTS: Student[] = [
  { id: 's1', name: 'Alex Chen', grade: '8th' },
  { id: 's2', name: 'Maya Patel', grade: '10th' },
  { id: 's3', name: 'Jordan Lee', grade: '7th' },
];
const SEED_SESSIONS: Session[] = [
  { id: 'ses1', studentId: 's1', date: '2026-04-01', efRatings: { taskInitiation: 2, workingMemory: 2, timeManagement: 2 }, tasks: [{ id: 't1', text: 'Break down history essay', completed: true }], notes: 'Struggled to start. Made a checklist together.' },
  { id: 'ses2', studentId: 's1', date: '2026-04-15', efRatings: { taskInitiation: 3, workingMemory: 2, timeManagement: 3 }, tasks: [{ id: 't2', text: 'Use timer for 20-min blocks', completed: true }], notes: 'Timer strategy helped.' },
  { id: 'ses3', studentId: 's1', date: '2026-05-01', efRatings: { taskInitiation: 4, workingMemory: 3, timeManagement: 3 }, tasks: [{ id: 't4', text: 'Review notes before session', completed: true }], notes: 'Great progress on initiation.' },
  { id: 'ses4', studentId: 's2', date: '2026-04-10', efRatings: { taskInitiation: 3, workingMemory: 4, timeManagement: 2 }, tasks: [], notes: 'Strong working memory.' },
  { id: 'ses5', studentId: 's2', date: '2026-05-05', efRatings: { taskInitiation: 4, workingMemory: 4, timeManagement: 3 }, tasks: [], notes: 'Time management improving.' },
  { id: 'ses6', studentId: 's3', date: '2026-05-10', efRatings: { taskInitiation: 2, workingMemory: 2, timeManagement: 1 }, tasks: [], notes: 'First session. Very motivated.' },
];
const SEED_HABITS: Habit[] = [
  { id: 'h1', studentId: 's1', text: 'Use a timer for homework' },
  { id: 'h2', studentId: 's1', text: 'Write down assignments at school' },
  { id: 'h3', studentId: 's1', text: 'Review notes before starting' },
];
const w0 = weekStartISO(0), w1 = weekStartISO(1), w2 = weekStartISO(2);
const SEED_WEEK_ENTRIES: WeekEntry[] = [
  { id: 'we1', studentId: 's1', weekStart: w2, goals: [{ id: 'wg1', text: 'Finish math problem set independently', completed: true }, { id: 'wg2', text: 'Pack bag the night before 3 days', completed: false }], habitChecks: ['h1', 'h2'], planNotes: 'Focus on math. Science project due Friday.' },
  { id: 'we2', studentId: 's1', weekStart: w1, goals: [{ id: 'wg3', text: 'Start homework within 20 min of getting home', completed: true }, { id: 'wg4', text: 'Use Pomodoro timer 4 days', completed: true }, { id: 'wg5', text: 'Email teacher about missing assignment', completed: false }], habitChecks: ['h1', 'h3'], planNotes: 'History essay due Wed and science lab Thurs.' },
  { id: 'we3', studentId: 's1', weekStart: w0, goals: [{ id: 'wg6', text: 'Make a homework priority list every day', completed: false }, { id: 'wg7', text: 'Ask for help before getting stuck 10+ min', completed: false }], habitChecks: [], planNotes: '' },
];
const SEED_OBLIGATIONS: Obligation[] = [
  { id: 'ob1', studentId: 's1', weekStart: w0, text: 'Math chapter 7 problems', plannedDate: weekStartISO(0), plannedTime: '16:00', completed: false },
  { id: 'ob2', studentId: 's1', weekStart: w0, text: 'English reading response', plannedDate: '', plannedTime: '', completed: false },
];

// ── Small components ───────────────────────────────────────────────────────────

function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`bg-white rounded-2xl border border-stone-100 shadow-sm ${onClick ? 'cursor-pointer' : ''} ${className}`}>{children}</div>;
}
function SkillBar({ value, color }: { value: number; color: string }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(v => <div key={v} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: v <= value ? color : '#e7e5e4' }} />)}</div>;
}
function SectionLabel({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="font-semibold text-stone-800 text-sm tracking-tight">{title}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Pomodoro Timer ─────────────────────────────────────────────────────────────

function PomodoroTimer() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const workSecs = 25 * 60, breakSecs = 5 * 60;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { setRunning(false); setMode(m => m === 'work' ? 'break' : 'work'); return s === 1 ? (mode === 'work' ? breakSecs : workSecs) : s - 1; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  function reset() { setRunning(false); setSeconds(mode === 'work' ? workSecs : breakSecs); }
  function toggle() { if (seconds === 0) reset(); else setRunning(r => !r); }
  function switchMode(m: 'work' | 'break') { setMode(m); setRunning(false); setSeconds(m === 'work' ? workSecs : breakSecs); }

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const pct = mode === 'work' ? (1 - seconds / workSecs) : (1 - seconds / breakSecs);
  const color = mode === 'work' ? '#7c3aed' : '#10b981';
  const r = 54, circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center py-6">
      <div className="flex gap-2 mb-8">
        {(['work', 'break'] as const).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={mode === m ? { backgroundColor: color, color: 'white' } : { backgroundColor: '#f5f5f4', color: '#78716c' }}>
            {m === 'work' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>
      <div className="relative w-36 h-36 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f5f5f4" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-stone-800">{mins}:{secs}</span>
          <span className="text-xs text-stone-400 mt-0.5">{mode === 'work' ? 'focus time' : 'break time'}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={toggle}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-colors"
          style={{ backgroundColor: color }}>
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="p-3 rounded-2xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"><RotateCcw size={16} /></button>
      </div>
      <p className="text-xs text-stone-400 mt-6 text-center max-w-xs">
        Work for 25 minutes, then take a 5-minute break. Repeat!
      </p>
    </div>
  );
}

// ── Chunking Tool ──────────────────────────────────────────────────────────────

function ChunkingTool({ studentId, projects, onSave }: { studentId: string; projects: ChunkProject[]; onSave: (p: ChunkProject) => void }) {
  const mine = projects.filter(p => p.studentId === studentId);
  const [active, setActive] = useState<ChunkProject | null>(null);
  const [newName, setNewName] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newStep, setNewStep] = useState('');
  const [creating, setCreating] = useState(false);

  function create() {
    if (!newName.trim()) return;
    const p: ChunkProject = {
      id: `cp-${Date.now()}`, studentId, name: newName.trim(), dueDate: newDue,
      steps: [
        { id: 'cs1', text: 'Understand what\'s being asked', done: false },
        { id: 'cs2', text: 'Gather materials / research', done: false },
        { id: 'cs3', text: 'Make a rough outline or plan', done: false },
        { id: 'cs4', text: 'Do the first draft or attempt', done: false },
        { id: 'cs5', text: 'Review and finish up', done: false },
      ],
    };
    onSave(p); setActive(p); setNewName(''); setNewDue(''); setCreating(false);
  }

  function toggleStep(stepId: string) {
    if (!active) return;
    const updated = { ...active, steps: active.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s) };
    onSave(updated); setActive(updated);
  }

  function addStep() {
    if (!active || !newStep.trim()) return;
    const updated = { ...active, steps: [...active.steps, { id: `cs-${Date.now()}`, text: newStep.trim(), done: false }] };
    onSave(updated); setActive(updated); setNewStep('');
  }

  if (active) return (
    <div>
      <button onClick={() => setActive(null)} className="flex items-center gap-1.5 text-sm text-stone-500 mb-4 hover:text-stone-700"><ArrowLeft size={14} /> All projects</button>
      <div className="mb-4">
        <h3 className="font-bold text-stone-800 text-base">{active.name}</h3>
        {active.dueDate && <p className="text-xs text-stone-400 mt-0.5">Due {fmtDate(active.dueDate)}</p>}
        <div className="h-2 bg-stone-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${(active.steps.filter(s => s.done).length / active.steps.length) * 100}%` }} />
        </div>
        <p className="text-xs text-stone-400 mt-1">{active.steps.filter(s => s.done).length} of {active.steps.length} steps done</p>
      </div>
      <div className="space-y-2 mb-3">
        {active.steps.map(step => (
          <div key={step.id} onClick={() => toggleStep(step.id)}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            style={{ backgroundColor: step.done ? '#f5f3ff' : 'white', borderColor: step.done ? '#ddd6fe' : '#f5f5f4' }}>
            {step.done ? <CheckCircle2 size={18} className="text-violet-500 flex-shrink-0" /> : <Circle size={18} className="text-stone-300 flex-shrink-0" />}
            <span className={`text-sm ${step.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>{step.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Add a step..." value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()} />
        <button onClick={addStep} className="bg-stone-100 px-3 rounded-xl text-stone-600 hover:bg-stone-200"><Plus size={15} /></button>
      </div>
    </div>
  );

  return (
    <div>
      {mine.length > 0 && (
        <div className="space-y-2 mb-4">
          {mine.map(p => (
            <div key={p.id} onClick={() => setActive(p)}
              className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-violet-200 cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-semibold text-stone-700">{p.name}</p>
                <p className="text-xs text-stone-400">{p.steps.filter(s => s.done).length}/{p.steps.length} steps · {p.dueDate ? `Due ${fmtDate(p.dueDate)}` : 'No due date'}</p>
              </div>
              <ChevronRight size={16} className="text-stone-400" />
            </div>
          ))}
        </div>
      )}
      {creating ? (
        <div className="border border-stone-200 rounded-2xl p-4 space-y-2">
          <input autoFocus className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Assignment name (e.g. History essay)" value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="date" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            value={newDue} onChange={e => setNewDue(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={create} className="flex-1 bg-violet-600 text-white text-sm font-semibold py-2 rounded-xl">Break it down</button>
            <button onClick={() => setCreating(false)} className="px-3 text-stone-500 text-sm hover:bg-stone-100 rounded-xl">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="w-full border-2 border-dashed border-stone-200 rounded-2xl py-4 text-stone-400 text-sm hover:border-violet-300 hover:text-violet-500 transition-colors flex items-center justify-center gap-2">
          <Plus size={15} /> Add a big assignment to break down
        </button>
      )}
    </div>
  );
}

// ── Custom widget ──────────────────────────────────────────────────────────────

const WIDGET_OPTIONS: { type: WidgetType; label: string; desc: string }[] = [
  { type: 'mood', label: 'Mood check-in', desc: 'Track how you\'re feeling each day' },
  { type: 'braindump', label: 'Brain dump', desc: 'Clear your head — write anything' },
  { type: 'gratitude', label: 'Gratitude log', desc: 'Three things you\'re grateful for' },
  { type: 'personal-goal', label: 'Personal goal', desc: 'Something you\'re working toward' },
];

function CustomWidget({ studentId, choice, onChoose, data, onSave }: {
  studentId: string; choice: WidgetType; onChoose: (w: WidgetType) => void;
  data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void;
}) {
  const [picking, setPicking] = useState(false);

  if (!choice || picking) return (
    <div>
      <p className="text-sm text-stone-500 mb-3">{picking ? 'Choose a different widget:' : 'What would you like here?'}</p>
      <div className="grid grid-cols-2 gap-2">
        {WIDGET_OPTIONS.map(o => (
          <button key={o.type} onClick={() => { onChoose(o.type); setPicking(false); }}
            className="flex flex-col items-start p-3 rounded-xl border border-stone-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-left">
            <span className="text-sm font-semibold text-stone-700">{o.label}</span>
            <span className="text-xs text-stone-400 mt-0.5">{o.desc}</span>
          </button>
        ))}
      </div>
      {picking && <button onClick={() => setPicking(false)} className="mt-3 text-sm text-stone-400 hover:text-stone-600">Cancel</button>}
    </div>
  );

  const opt = WIDGET_OPTIONS.find(o => o.type === choice)!;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-700">{opt.label}</span>
        </div>
        <button onClick={() => setPicking(true)} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"><Pencil size={11} /> Change</button>
      </div>
      {choice === 'mood' && <MoodWidget data={data} onSave={onSave} />}
      {choice === 'braindump' && <BrainDumpWidget data={data} onSave={onSave} />}
      {choice === 'gratitude' && <GratitudeWidget data={data} onSave={onSave} />}
      {choice === 'personal-goal' && <PersonalGoalWidget data={data} onSave={onSave} />}
    </div>
  );
}

function MoodWidget({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const entries = (data.entries as MoodEntry[]) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find(e => e.date === today);
  const [note, setNote] = useState(todayEntry?.note ?? '');
  const MOODS = ['😩', '😕', '😐', '😊', '😄'];

  function save(level: number) {
    const updated = entries.filter(e => e.date !== today);
    onSave({ entries: [...updated, { date: today, level, note }] });
  }

  return (
    <div>
      <p className="text-xs text-stone-400 mb-3">How are you feeling today?</p>
      <div className="flex gap-2 mb-3">
        {MOODS.map((m, i) => (
          <button key={i} onClick={() => save(i + 1)}
            className="flex-1 text-2xl p-2 rounded-xl transition-all hover:scale-110"
            style={{ backgroundColor: todayEntry?.level === i + 1 ? '#f5f3ff' : 'transparent', border: todayEntry?.level === i + 1 ? '2px solid #7c3aed' : '2px solid transparent' }}>
            {m}
          </button>
        ))}
      </div>
      {todayEntry && <p className="text-xs text-center text-violet-600 font-medium">{MOODS[todayEntry.level - 1]} logged today</p>}
    </div>
  );
}

function BrainDumpWidget({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const [text, setText] = useState((data.text as string) ?? '');
  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">Write anything — no rules, no judgment.</p>
      <textarea className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        rows={4} placeholder="What's on your mind?" value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onSave({ text })} />
    </div>
  );
}

function GratitudeWidget({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = (data.entries as { date: string; items: string[] }[]) ?? [];
  const todayItems = entries.find(e => e.date === today)?.items ?? ['', '', ''];
  const [items, setItems] = useState<string[]>(todayItems.length === 3 ? todayItems : ['', '', '']);

  function update(i: number, val: string) {
    const next = [...items]; next[i] = val; setItems(next);
    const updated = entries.filter(e => e.date !== today);
    onSave({ entries: [...updated, { date: today, items: next }] });
  }

  return (
    <div className="space-y-2">
      {['Something good that happened', 'Someone I appreciate', 'Something I\'m looking forward to'].map((ph, i) => (
        <input key={i} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
          placeholder={ph} value={items[i]} onChange={e => update(i, e.target.value)} />
      ))}
    </div>
  );
}

function PersonalGoalWidget({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const [goal, setGoal] = useState((data.goal as string) ?? '');
  const [why, setWhy] = useState((data.why as string) ?? '');
  return (
    <div className="space-y-2">
      <input className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        placeholder="My goal is..." value={goal} onChange={e => setGoal(e.target.value)} onBlur={() => onSave({ goal, why })} />
      <input className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        placeholder="Because..." value={why} onChange={e => setWhy(e.target.value)} onBlur={() => onSave({ goal, why })} />
    </div>
  );
}

// ── Assessment ─────────────────────────────────────────────────────────────────

type MCOption = { text: string; score: number };
type MCQuestion = { id: string; area: 'ti' | 'wm' | 'tm' | 'po'; text: string; options: MCOption[] };
type SAQuestion = { id: string; prompt: string };

function opts(a: string, b: string, c: string, d: string): MCOption[] {
  return [{ text: a, score: 4 }, { text: b, score: 3 }, { text: c, score: 2 }, { text: d, score: 1 }];
}

const AREA_META: Record<string, { label: string; color: string; bg: string }> = {
  ti: { label: 'Getting Started',         color: '#7c3aed', bg: '#f5f3ff' },
  wm: { label: 'Focus & Memory',          color: '#0369a1', bg: '#f0f9ff' },
  tm: { label: 'Managing Time',           color: '#047857', bg: '#f0fdf4' },
  po: { label: 'Planning & Organization', color: '#b45309', bg: '#fffbeb' },
};

const MC_QUESTIONS: MCQuestion[] = [
  // ── Getting Started (task initiation) ──────────────────────────────────────
  { id: 'ti01', area: 'ti', text: 'After school, knowing you have homework, you usually...', options: opts('Start right after a short break', 'Start after an hour or so', 'Wait until evening, often feeling rushed', 'Have to be reminded multiple times before starting') },
  { id: 'ti02', area: 'ti', text: 'When given a big assignment, before starting you...', options: opts('Break it into smaller steps and begin the first one', 'Look it over and eventually dive in', 'Think about it a lot but have trouble actually starting', 'Avoid it until the last minute') },
  { id: 'ti03', area: 'ti', text: 'When a task feels overwhelming, you...', options: opts('Focus on just the first small step', 'Take a break then try again', 'Sit with it but make little progress', 'Give up or switch to something else entirely') },
  { id: 'ti04', area: 'ti', text: 'During free work time in class, you usually...', options: opts('Get started immediately', 'Start after a few minutes of settling in', 'Spend most of the time getting ready to work', 'Use the time for other things') },
  { id: 'ti05', area: 'ti', text: 'Your biggest challenge when sitting down to do homework is...', options: opts('Not much — I just start', 'Deciding which subject to begin with', 'Actually opening the assignment and beginning', 'Convincing myself to sit down in the first place') },
  { id: 'ti06', area: 'ti', text: 'If an assignment is boring or uninteresting, you...', options: opts('Do it anyway — it needs to get done', 'Start it but take more breaks than usual', 'Delay starting it significantly', 'Often leave it for the last minute or don\'t finish') },
  { id: 'ti07', area: 'ti', text: 'When you receive a new assignment, you typically...', options: opts('Record it and plan when you\'ll do it', 'Keep it in mind and start when you can', 'Sometimes forget about it until later', 'Often forget about it entirely') },
  { id: 'ti08', area: 'ti', text: 'At the start of a study session, you...', options: opts('Know exactly what you\'re working on and begin', 'Figure out what to do first, then start', 'Spend time organizing before getting to actual work', 'Struggle to figure out where to begin') },
  { id: 'ti09', area: 'ti', text: 'When someone suggests you start on a project, you...', options: opts('Start soon after hearing that', 'Start within the day', 'Start a few days later', 'Wait until it\'s nearly due') },
  { id: 'ti10', area: 'ti', text: 'How often do you submit assignments late?', options: opts('Rarely or never', 'Occasionally', 'Often', 'Very frequently') },
  // ── Focus & Memory (working memory) ────────────────────────────────────────
  { id: 'wm01', area: 'wm', text: 'When your teacher gives three-step instructions, by the time you start you...', options: opts('Remember all three steps clearly', 'Remember most of them', 'Remember one or two', 'Have to ask someone to repeat them') },
  { id: 'wm02', area: 'wm', text: 'When reading a textbook, how often do you reach the end of a page without remembering what you read?', options: opts('Rarely — I stay focused', 'Sometimes', 'Often', 'Almost always') },
  { id: 'wm03', area: 'wm', text: 'In the middle of doing a task, you...', options: opts('Stay on track and remember your goal', 'Occasionally lose track of what you were doing', 'Frequently lose track of where you were', 'Often have to restart because you\'ve forgotten') },
  { id: 'wm04', area: 'wm', text: 'If someone asks you to do several things, you...', options: opts('Remember all of them and complete them in order', 'Remember most but occasionally miss one', 'Usually need to write things down to remember', 'Often forget and need reminders') },
  { id: 'wm05', area: 'wm', text: 'During a test, you...', options: opts('Recall studied material without much trouble', 'Recall most of it with some effort', 'Struggle to recall things you studied', 'Often blank on material you knew the night before') },
  { id: 'wm06', area: 'wm', text: 'When writing an essay, you...', options: opts('Hold your ideas and structure in mind while writing', 'Occasionally lose your train of thought', 'Frequently lose track of your argument', 'Have to re-read constantly just to remember what you wrote') },
  { id: 'wm07', area: 'wm', text: 'If you\'re interrupted mid-task, you...', options: opts('Pick right back up where you left off', 'Need a moment to remember where you were', 'Often lose significant progress', 'Have trouble restarting and sometimes give up') },
  { id: 'wm08', area: 'wm', text: 'How often do you forget to bring materials (books, homework) to school or home?', options: opts('Rarely — I have a system', 'Occasionally', 'Often', 'Almost every week') },
  { id: 'wm09', area: 'wm', text: 'When copying notes from the board, you...', options: opts('Read and write chunks without losing information', 'Have to look up frequently but manage', 'Often forget parts between looking and writing', 'Struggle to keep up and often miss things') },
  { id: 'wm10', area: 'wm', text: 'After studying for a test, you...', options: opts('Feel confident you\'ll remember the material', 'Remember most of it during the test', 'Sometimes remember less than expected', 'Frequently forget things between studying and the test') },
  // ── Managing Time ───────────────────────────────────────────────────────────
  { id: 'tm01', area: 'tm', text: 'When you have a week to complete an assignment, you...', options: opts('Start early and work a little each day', 'Start a few days before it\'s due', 'Start the night before', 'Often start the day it\'s due') },
  { id: 'tm02', area: 'tm', text: 'How often are you late turning in work?', options: opts('Rarely or never', 'Occasionally', 'Frequently', 'Almost always') },
  { id: 'tm03', area: 'tm', text: 'When estimating how long a task will take, you...', options: opts('Are usually accurate', 'Sometimes underestimate', 'Often underestimate significantly', 'Almost always run out of time') },
  { id: 'tm04', area: 'tm', text: 'On a day with multiple things due, you...', options: opts('Prioritize and work through your list', 'Get most things done but feel stressed', 'Struggle to complete everything', 'Often miss deadlines') },
  { id: 'tm05', area: 'tm', text: 'How far ahead do you think about upcoming deadlines?', options: opts('Days or weeks ahead', 'A couple of days ahead', 'The day before', 'When it\'s already late') },
  { id: 'tm06', area: 'tm', text: 'When you have unstructured time to work on a project, you...', options: opts('Use it productively', 'Use some of it well', 'Spend most of it on other things', 'Rarely make meaningful progress') },
  { id: 'tm07', area: 'tm', text: 'If you realize mid-assignment that you\'re running out of time, you...', options: opts('Adjust your pace and prioritize what remains', 'Try to rush through it', 'Panic and have trouble finishing', 'Submit incomplete work') },
  { id: 'tm08', area: 'tm', text: 'Do you use any system to track deadlines (planner, app, reminders)?', options: opts('Yes, consistently', 'Sometimes', 'I try but don\'t stick with it', 'No — I rely on memory') },
  { id: 'tm09', area: 'tm', text: 'When you get home after school, you...', options: opts('Know exactly what\'s due and when', 'Have a general sense of what\'s due', 'Often have to check or ask', 'Often don\'t know until it\'s late') },
  { id: 'tm10', area: 'tm', text: 'At the end of a homework session, you...', options: opts('Know you finished everything and feel prepared', 'Finish most things but occasionally miss something', 'Often realize you forgot something', 'Frequently leave things incomplete') },
  // ── Planning & Organization ─────────────────────────────────────────────────
  { id: 'po01', area: 'po', text: 'When given a long-term project, your first instinct is to...', options: opts('Map out steps and set mini-deadlines', 'Think through what needs to happen', 'Wait and see what comes up', 'Not think about it until it\'s close to due') },
  { id: 'po02', area: 'po', text: 'Your school bag and materials are usually...', options: opts('Organized and ready to go', 'Mostly organized', 'Often messy — hard to find things', 'Frequently missing things you need') },
  { id: 'po03', area: 'po', text: 'Before an exam, you start reviewing material...', options: opts('At least a week before', 'A few days before', 'The night before', 'The morning of') },
  { id: 'po04', area: 'po', text: 'When facing a complicated task, you...', options: opts('Break it into clear steps before starting', 'Identify a few key steps', 'Have a vague sense but struggle to structure it', 'Jump in and figure it out as you go') },
  { id: 'po05', area: 'po', text: 'Your homework workspace is usually...', options: opts('Organized and free from distractions', 'Somewhat organized', 'Often cluttered or distracting', 'Wherever I land — no regular spot') },
  { id: 'po06', area: 'po', text: 'If you have multiple deadlines in one week, you...', options: opts('Create a schedule to balance them', 'Keep track mentally and try to balance', 'Focus on one at a time without much planning', 'Feel overwhelmed and struggle to manage them') },
  { id: 'po07', area: 'po', text: 'When given a rubric for an assignment, you...', options: opts('Read it carefully and use it to guide your work', 'Skim it and refer back if needed', 'Look at it briefly but don\'t really use it', 'Often don\'t read it until after') },
  { id: 'po08', area: 'po', text: 'How do you track your assignments?', options: opts('A planner, app, or consistent system', 'Write things down sometimes', 'Mostly rely on memory', 'Often lose track of assignments entirely') },
  { id: 'po09', area: 'po', text: 'After finishing homework or a project, you...', options: opts('Review it, pack it, and know it\'s ready', 'Put it somewhere you\'ll remember', 'Leave it and hope you remember', 'Frequently forget to submit even when it\'s done') },
  { id: 'po10', area: 'po', text: 'When starting a new assignment, you...', options: opts('Read all instructions carefully before starting', 'Read most of the instructions', 'Skim the instructions', 'Start without reading instructions fully') },
];

const SA_QUESTIONS: SAQuestion[] = [
  { id: 'sa01', prompt: 'You find out on Monday that you have a quiz next Friday on a chapter you haven\'t fully reviewed yet. Walk me through exactly what you would do between now and Friday.' },
  { id: 'sa02', prompt: 'You have three things due on the same day: a math worksheet, a reading response, and a science test to study for. How do you decide what to do first, and what does your plan look like?' },
  { id: 'sa03', prompt: 'You get home and realize you left an important worksheet at school that\'s due tomorrow. What do you do?' },
  { id: 'sa04', prompt: 'Your teacher assigns a research project due in four weeks. It\'s the first day you\'ve heard about it. Describe your plan for getting it done.' },
  { id: 'sa05', prompt: 'You\'ve been sitting at your desk for 30 minutes but haven\'t done much — your phone keeps buzzing and your mind keeps wandering. What do you do?' },
];

const HABIT_SUGGESTIONS: Record<EFKey, string[]> = {
  taskInitiation: [
    'Set a timer and commit to starting within 5 minutes of sitting down',
    'Write down tomorrow\'s first task before going to sleep',
    'Use the 2-minute rule: if it takes under 2 minutes, do it now',
    'Start homework within 30 minutes of getting home each day',
  ],
  workingMemory: [
    'Write down all assignments the moment they\'re given',
    'Review your notes within 24 hours of class',
    'Use a checklist for any task with more than two steps',
    'Read back what you\'ve written every few paragraphs while writing',
  ],
  timeManagement: [
    'Check your planner or calendar every morning',
    'Set a personal deadline 2 days before the real one',
    'Break long assignments into timed 20-minute blocks',
    'Pack your bag and review tomorrow\'s schedule the night before',
  ],
};

function computeEFRatings(mcAnswers: Record<string, number>): Record<EFKey, number> {
  const avg = (ids: string[]) => {
    const scores = ids.map(id => mcAnswers[id] ?? 0).filter(s => s > 0);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
  };
  const scale = (raw: number) => Math.min(5, Math.max(1, Math.round(raw * 5 / 4)));
  return {
    taskInitiation: scale(avg(['ti01','ti02','ti03','ti04','ti05','ti06','ti07','ti08','ti09','ti10'])),
    workingMemory:  scale(avg(['wm01','wm02','wm03','wm04','wm05','wm06','wm07','wm08','wm09','wm10'])),
    timeManagement: scale(avg(['tm01','tm02','tm03','tm04','tm05','tm06','tm07','tm08','tm09','tm10',
                               'po01','po02','po03','po04','po05','po06','po07','po08','po09','po10'])),
  };
}

function AssessmentView({ student, fg, onComplete, onBack }: {
  student: Student; fg: string;
  onComplete: (ratings: Record<EFKey, number>, habits: string[], saAnswers: Record<string, string>) => void;
  onBack: () => void;
}) {
  const TOTAL = MC_QUESTIONS.length + SA_QUESTIONS.length; // 45
  const [step, setStep] = useState(0); // 0=intro, 1-40=MC, 41-45=SA, 46=results
  const [mcAnswers, setMcAnswers] = useState<Record<string, number>>({});
  const [saAnswers, setSaAnswers] = useState<Record<string, string>>({});
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [justSelected, setJustSelected] = useState<number | null>(null);

  const isMC = step >= 1 && step <= 40;
  const isSA = step >= 41 && step <= 45;
  const isResults = step === 46;
  const mcQ = isMC ? MC_QUESTIONS[step - 1] : null;
  const saQ = isSA ? SA_QUESTIONS[step - 41] : null;
  const progress = step / TOTAL;
  const firstName = student.name.split(' ')[0];

  function selectMC(score: number) {
    if (!mcQ || justSelected !== null) return;
    setJustSelected(score);
    setMcAnswers(prev => ({ ...prev, [mcQ.id]: score }));
    setTimeout(() => { setJustSelected(null); setStep(s => s + 1); }, 320);
  }

  function finishAssessment() {
    const ratings = computeEFRatings(mcAnswers);
    const sorted = (Object.keys(ratings) as EFKey[]).sort((a, b) => ratings[a] - ratings[b]);
    const pre = [
      ...HABIT_SUGGESTIONS[sorted[0]].slice(0, 2),
      ...HABIT_SUGGESTIONS[sorted[1]].slice(0, 1),
    ];
    setSelectedHabits(pre);
    setStep(46);
  }

  function toggleHabit(h: string) {
    setSelectedHabits(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (isResults) {
    const ratings = computeEFRatings(mcAnswers);
    const areaResults = EF_AREAS.map(a => ({ area: a, rating: ratings[a.key] })).sort((a, b) => a.rating - b.rating);
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-xl font-bold text-stone-800 mb-1">Assessment results</h1>
          <p className="text-sm text-stone-500 mb-6">{student.name} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-3 mb-6">
            {areaResults.map(({ area, rating }) => (
              <Card key={area.key} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-stone-800">{area.label}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: area.bg, color: area.color }}>
                    {EF_LEVEL_LABELS[rating]}
                  </span>
                </div>
                <SkillBar value={rating} color={area.color} />
                {rating <= 2 && <p className="text-xs text-stone-500 mt-1.5">Priority area — worth focusing on in early sessions.</p>}
              </Card>
            ))}
          </div>

          <Card className="p-5 mb-5">
            <p className="text-sm font-semibold text-stone-800 mb-1">Recommended habits</p>
            <p className="text-xs text-stone-500 mb-3">Select the ones to add to {firstName}'s profile.</p>
            <div className="space-y-2">
              {(Object.keys(HABIT_SUGGESTIONS) as EFKey[]).flatMap(key =>
                HABIT_SUGGESTIONS[key].map(h => {
                  const area = EF_AREAS.find(a => a.key === key)!;
                  const checked = selectedHabits.includes(h);
                  return (
                    <div key={h} onClick={() => toggleHabit(h)}
                      className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                      style={{ backgroundColor: checked ? area.bg : 'white', borderColor: checked ? area.color + '50' : '#f5f5f4' }}>
                      {checked
                        ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: area.color }} />
                        : <Circle size={16} className="text-stone-300 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-sm text-stone-700">{h}</p>
                        <p className="text-xs mt-0.5" style={{ color: area.color }}>{area.label}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {Object.values(saAnswers).some(v => v.trim()) && (
            <Card className="p-5 mb-6">
              <p className="text-sm font-semibold text-stone-800 mb-3">Planning responses</p>
              <div className="space-y-4">
                {SA_QUESTIONS.map(q => saAnswers[q.id]?.trim() ? (
                  <div key={q.id}>
                    <p className="text-xs font-medium text-stone-500 mb-1.5">{q.prompt}</p>
                    <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3 leading-relaxed">{saAnswers[q.id]}</p>
                  </div>
                ) : null)}
              </div>
            </Card>
          )}

          <button onClick={() => onComplete(ratings, selectedHabits, saAnswers)}
            className="w-full py-3 rounded-2xl text-white font-semibold text-sm"
            style={{ backgroundColor: fg }}>
            Apply to {firstName}'s profile
          </button>
        </div>
      </div>
    );
  }

  // ── Short answer ─────────────────────────────────────────────────────────────
  if (isSA && saQ) {
    const isLast = step === TOTAL;
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setStep(s => s - 1)} className="text-stone-400 hover:text-stone-600 transition-colors"><ArrowLeft size={16} /></button>
            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: fg }} />
            </div>
            <span className="text-xs text-stone-400 flex-shrink-0">{step}/{TOTAL}</span>
          </div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-4 bg-amber-50 text-amber-700">
            Planning scenario {step - 40} of {SA_QUESTIONS.length}
          </div>
          <p className="text-base font-semibold text-stone-800 leading-relaxed mb-6">{saQ.prompt}</p>
          <textarea
            className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-violet-400 resize-none mb-4"
            rows={6} placeholder="Write your response here..."
            value={saAnswers[saQ.id] ?? ''}
            onChange={e => setSaAnswers(prev => ({ ...prev, [saQ.id]: e.target.value }))}
          />
          <div className="flex gap-3">
            <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors">
              Back
            </button>
            <button onClick={isLast ? finishAssessment : () => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity"
              style={{ backgroundColor: fg }}>
              {isLast ? 'See results' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Multiple choice question ──────────────────────────────────────────────────
  if (isMC && mcQ) {
    const meta = AREA_META[mcQ.area];
    const letter = (i: number) => String.fromCharCode(65 + i);
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} className="text-stone-400 hover:text-stone-600 transition-colors"><ArrowLeft size={16} /></button>
            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: fg }} />
            </div>
            <span className="text-xs text-stone-400 flex-shrink-0">{step}/{TOTAL}</span>
          </div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: meta.color + '15', color: meta.color }}>
            {meta.label}
          </div>
          <p className="text-base font-semibold text-stone-800 leading-relaxed mb-6">{mcQ.text}</p>
          <div className="space-y-2.5">
            {mcQ.options.map((opt, i) => {
              const sel = justSelected === opt.score;
              return (
                <button key={i} onClick={() => selectMC(opt.score)}
                  className="w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all"
                  style={{ backgroundColor: sel ? meta.color + '12' : 'white', borderColor: sel ? meta.color : '#e7e5e4' }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-colors"
                    style={{ backgroundColor: sel ? meta.color : '#f5f5f4', color: sel ? 'white' : '#78716c' }}>
                    {letter(i)}
                  </span>
                  <span className="text-sm text-stone-700 leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Intro ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"><ArrowLeft size={15} /> Back</button>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">EF Assessment</h1>
        <p className="text-stone-500 text-sm mb-8">For {firstName} · ~15 minutes · 40 questions + 5 scenarios</p>
        <div className="space-y-2.5 mb-8">
          {[
            { label: 'Getting Started',         count: 10, color: AREA_META.ti.color, bg: AREA_META.ti.bg },
            { label: 'Focus & Memory',          count: 10, color: AREA_META.wm.color, bg: AREA_META.wm.bg },
            { label: 'Managing Time',           count: 10, color: AREA_META.tm.color, bg: AREA_META.tm.bg },
            { label: 'Planning & Organization', count: 10, color: AREA_META.po.color, bg: AREA_META.po.bg },
            { label: 'Planning scenarios',      count: 5,  color: '#78716c',          bg: '#f5f5f4' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: bg }}>
              <span className="text-sm font-medium text-stone-700">{label}</span>
              <span className="text-xs font-semibold" style={{ color }}>{count} {count === 5 ? 'scenarios' : 'questions'}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setStep(1)}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: fg }}>
          Begin assessment
        </button>
      </div>
    </div>
  );
}

// ── Personality Questionnaire ──────────────────────────────────────────────────

const PERSONALITY_QUESTIONS = [
  { id: 'vibe',    label: 'How would you describe your personal style or vibe?',         placeholder: 'e.g. chill and artsy, sporty and energetic, nerdy and cozy...' },
  { id: 'colors',  label: 'What are your favorite colors?',                              placeholder: 'e.g. deep blue and gold, earth tones, neon...' },
  { id: 'music',   label: 'What music do you listen to most?',                           placeholder: 'e.g. lo-fi hip hop, pop punk, K-pop, jazz...' },
  { id: 'media',   label: 'Favorite movies, shows, or books?',                          placeholder: 'e.g. Avatar, Attack on Titan, Percy Jackson...' },
  { id: 'hobbies', label: 'What do you do for fun outside of school?',                  placeholder: 'e.g. drawing, gaming, soccer, coding, cooking...' },
  { id: 'goals',   label: 'What\'s something you\'re working toward this year?',        placeholder: 'e.g. make varsity, learn guitar, get into a good college...' },
  { id: 'art',     label: 'What kind of art or visuals appeal to you?',                 placeholder: 'e.g. anime, minimalist, retro/vintage, nature photography...' },
  { id: 'energy',  label: 'Are you more of a calm/focused type or high-energy/bold?',   placeholder: 'e.g. I like calm and peaceful environments...' },
];

function PersonalityQuestionnaire({ student, onComplete, onBack }: {
  student: Student;
  onComplete: (theme: StudentTheme) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstName = student.name.split(' ')[0];
  const filled = PERSONALITY_QUESTIONS.filter(q => answers[q.id]?.trim()).length;
  const canSubmit = filled >= 4;

  async function generateTheme() {
    setLoading(true);
    setError('');
    try {
      const payload = Object.fromEntries(
        PERSONALITY_QUESTIONS
          .filter(q => answers[q.id]?.trim())
          .map(q => [q.label, answers[q.id]])
      );
      const res = await fetch('/api/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (data.theme) {
        onComplete(data.theme as StudentTheme);
      } else {
        setError('Something went wrong. Try again.');
      }
    } catch {
      setError('Network error. Make sure the API key is set.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-1">Make it yours, {firstName}</h1>
          <p className="text-sm text-stone-500">Answer a few questions and we'll build a dashboard that actually feels like you. Answer at least 4 to get started.</p>
        </div>

        <div className="space-y-4 mb-8">
          {PERSONALITY_QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-stone-700 mb-2">
                <span className="text-stone-400 mr-2">{i + 1}.</span>{q.label}
              </p>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-violet-400"
                placeholder={q.placeholder}
                value={answers[q.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

        <button
          onClick={generateTheme}
          disabled={!canSubmit || loading}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: canSubmit && !loading ? '#7c3aed' : '#d6d3d1' }}>
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating your theme...
            </>
          ) : `Build my dashboard${!canSubmit ? ` (${4 - filled} more to go)` : ''}`}
        </button>
        <p className="text-xs text-stone-400 text-center mt-3">
          Powered by AI · You can always tweak colors afterward
        </p>
      </div>
    </div>
  );
}

// ── Theme Customizer ───────────────────────────────────────────────────────────

function ThemeCustomizer({ theme, onSave }: { theme: StudentTheme; onSave: (t: StudentTheme) => void }) {
  const [draft, setDraft] = useState<StudentTheme>(theme);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof StudentTheme>(key: K, val: StudentTheme[K]) {
    setDraft(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function apply() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const LAYOUTS: { key: ThemeLayout; label: string; icon: React.ReactNode }[] = [
    { key: 'sidebar', label: 'Sidebar', icon: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="0.5" y="0.5" width="31" height="23" rx="3" fill="white" stroke="#d4d4d4"/>
        <rect x="1" y="1" width="9" height="22" rx="2" fill="#e5e7eb"/>
        <rect x="12" y="4" width="18" height="3" rx="1" fill="#d4d4d4"/>
        <rect x="12" y="9" width="14" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="12" y="13" width="16" height="2" rx="1" fill="#e5e7eb"/>
      </svg>
    )},
    { key: 'header', label: 'Header', icon: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="0.5" y="0.5" width="31" height="23" rx="3" fill="white" stroke="#d4d4d4"/>
        <rect x="1" y="1" width="30" height="7" rx="2" fill="#e5e7eb"/>
        <rect x="3" y="11" width="12" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="3" y="15" width="9" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="17" y="11" width="12" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="17" y="15" width="9" height="2" rx="1" fill="#e5e7eb"/>
      </svg>
    )},
  ];

  return (
    <div>
      {/* Tagline preview */}
      <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium italic text-center"
        style={{ backgroundColor: draft.bgColor, color: draft.primaryColor, border: `1px solid ${draft.primaryColor}25` }}>
        "{draft.tagline}"
        <p className="text-xs font-normal not-italic mt-0.5 opacity-60">{draft.vibe}</p>
      </div>

      {/* Preset picker */}
      <p className="text-[11px] text-stone-400 uppercase font-bold tracking-wide mb-2">Style</p>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(Object.entries(PRESET_CONFIGS) as [ThemePreset, typeof PRESET_CONFIGS[ThemePreset]][]).map(([key, cfg]) => {
          const active = draft.preset === key;
          return (
            <button key={key} onClick={() => update('preset', key)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all"
              style={{ borderColor: active ? draft.primaryColor : 'transparent', backgroundColor: active ? `${draft.primaryColor}10` : '#f5f5f4' }}>
              <div className="w-full h-8 rounded-lg border border-stone-200 flex items-center justify-center gap-1 overflow-hidden"
                style={{ backgroundColor: cfg.swatch }}>
                <div className="w-3 h-3 bg-stone-400 opacity-50" style={{ borderRadius: cfg.cardRadius }} />
                <div className="w-5 h-2 bg-stone-400 opacity-30" style={{ borderRadius: cfg.cardRadius }} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: active ? draft.primaryColor : '#78716c' }}>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layout picker */}
      <p className="text-[11px] text-stone-400 uppercase font-bold tracking-wide mb-2">Layout</p>
      <div className="flex gap-2 mb-5">
        {LAYOUTS.map(({ key, label, icon }) => {
          const active = draft.layout === key;
          return (
            <button key={key} onClick={() => update('layout', key)}
              className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
              style={{ borderColor: active ? draft.primaryColor : 'transparent', backgroundColor: active ? `${draft.primaryColor}10` : '#f5f5f4' }}>
              {icon}
              <span className="text-[11px] font-semibold" style={{ color: active ? draft.primaryColor : '#78716c' }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Dark mode */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <p className="text-sm font-semibold text-stone-700">Dark mode</p>
          <p className="text-xs text-stone-400">Easier on the eyes at night</p>
        </div>
        <button onClick={() => update('darkMode', !draft.darkMode)}
          className="w-11 h-6 rounded-full transition-colors flex-shrink-0 relative"
          style={{ backgroundColor: draft.darkMode ? draft.primaryColor : '#d6d3d1' }}>
          <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
            style={{ left: draft.darkMode ? '22px' : '2px' }} />
        </button>
      </div>

      {/* Colors */}
      <p className="text-[11px] text-stone-400 uppercase font-bold tracking-wide mb-2">Colors</p>
      <div className="space-y-2.5 mb-5">
        {([
          ['primaryColor', 'Main color'] as const,
          ['accentColor',  'Accent']     as const,
          ['bgColor',      'Background'] as const,
          ['cardBg',       'Cards']      as const,
        ]).map(([key, label]) => (
          <div key={key} className="flex items-center gap-3">
            <input type="color" value={draft[key] ?? '#ffffff'} onChange={e => update(key, e.target.value)}
              className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer flex-shrink-0 p-0.5" />
            <span className="text-sm text-stone-600">{label}</span>
            <span className="text-xs text-stone-400 ml-auto font-mono">{draft[key]}</span>
          </div>
        ))}
      </div>

      {/* Tagline */}
      <p className="text-[11px] text-stone-400 uppercase font-bold tracking-wide mb-2">Tagline</p>
      <input className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400 mb-5"
        value={draft.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Your personal motto..." />

      <button onClick={apply}
        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
        style={{ backgroundColor: saved ? '#10b981' : draft.primaryColor, borderRadius: PRESET_CONFIGS[draft.preset]?.buttonRadius ?? '12px' }}>
        {saved ? 'Applied!' : 'Apply theme'}
      </button>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────

type View = 'roster' | 'student' | 'development' | 'assessment' | 'personality';
type FocusTab = 'pomodoro' | 'chunking';
type StudentTab = 'review' | 'week' | 'focus' | 'space';

export default function Page() {
  const [view, setView] = useState<View>('roster');
  const [focusTab, setFocusTab] = useState<FocusTab>('pomodoro');
  const [studentTab, setStudentTab] = useState<StudentTab>('review');
  const [tabVisible, setTabVisible] = useState(true);
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [sessions, setSessions] = useState<Session[]>(SEED_SESSIONS);
  const [habits, setHabits] = useState<Habit[]>(SEED_HABITS);
  const [weekEntries, setWeekEntries] = useState<WeekEntry[]>(SEED_WEEK_ENTRIES);
  const [obligations, setObligations] = useState<Obligation[]>(SEED_OBLIGATIONS);
  const [chunkProjects, setChunkProjects] = useState<ChunkProject[]>([]);
  const [widgetChoices, setWidgetChoices] = useState<Record<string, WidgetType>>({});
  const [widgetData, setWidgetData] = useState<Record<string, Record<string, unknown>>>({});
  const [studentThemes, setStudentThemes] = useState<Record<string, StudentTheme>>({});
  const [designTheme, setDesignTheme] = useState<DesignTheme>(DESIGN_THEMES[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [focusedRosterId, setFocusedRosterId] = useState<string | null>(null);
  const [rosterHovered, setRosterHovered] = useState(false);
  const cursor = useCursor();

  // ── Page-wipe transition ─────────────────────────────────────────────────
  const [curtainPhase, setCurtainPhase] = useState<'idle' | 'covering' | 'uncovering'>('idle');
  const pendingNavRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (curtainPhase === 'covering') {
      const t = setTimeout(() => {
        pendingNavRef.current?.();
        pendingNavRef.current = null;
        setCurtainPhase('uncovering');
      }, 540);
      return () => clearTimeout(t);
    }
    if (curtainPhase === 'uncovering') {
      const t = setTimeout(() => setCurtainPhase('idle'), 540);
      return () => clearTimeout(t);
    }
  }, [curtainPhase]);

  function navigate(callback: () => void) {
    pendingNavRef.current = callback;
    setCurtainPhase('covering');
  }
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newObText, setNewObText] = useState('');
  const [newObDate, setNewObDate] = useState('');
  const [newObTime, setNewObTime] = useState('');

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null;
  const thisWeek = weekStartISO(0);
  const lastWeek = weekStartISO(1);

  function getWeekEntry(studentId: string, ws: string): WeekEntry {
    return weekEntries.find(e => e.studentId === studentId && e.weekStart === ws) ??
      { id: `we-${studentId}-${ws}`, studentId, weekStart: ws, goals: [], habitChecks: [], planNotes: '' };
  }

  function updateWeekEntry(entry: WeekEntry) {
    setWeekEntries(prev => {
      const exists = prev.some(e => e.studentId === entry.studentId && e.weekStart === entry.weekStart);
      return exists ? prev.map(e => e.studentId === entry.studentId && e.weekStart === entry.weekStart ? entry : e) : [...prev, entry];
    });
  }

  function switchStudentTab(tab: StudentTab) {
    setTabVisible(false);
    setTimeout(() => { setStudentTab(tab); setTabVisible(true); }, 150);
  }

  function addStudent() {
    if (!newName.trim()) return;
    setStudents(prev => [...prev, { id: `s${Date.now()}`, name: newName.trim(), grade: newGrade.trim() }]);
    setNewName(''); setNewGrade(''); setShowAddStudent(false);
  }

  function applyAssessment(studentId: string, ratings: Record<EFKey, number>, newHabits: string[], _saAnswers: Record<string, string>) {
    setSessions(prev => [...prev, {
      id: `ses-${Date.now()}`, studentId,
      date: new Date().toISOString().slice(0, 10),
      efRatings: ratings,
      tasks: [],
      notes: 'Initial EF assessment',
    }]);
    setHabits(prev => [
      ...prev,
      ...newHabits.map((text, i) => ({ id: `h-${Date.now()}-${i}`, studentId, text })),
    ]);
    navigate(() => setView('student'));
  }

  // ── Page-wipe curtain (renders above every view) ─────────────────────────────
  const Curtain = curtainPhase !== 'idle' ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      backgroundColor: designTheme.sidebar.bg,
      animation: curtainPhase === 'covering'
        ? 'gdCurtainDown 540ms cubic-bezier(0.4,0,0.2,1) forwards'
        : 'gdCurtainContinue 540ms cubic-bezier(0.4,0,0.2,1) forwards',
      pointerEvents: 'all',
    }}>
      <style>{`
        @keyframes gdCurtainDown {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        @keyframes gdCurtainContinue {
          from { transform: translateY(0); }
          to   { transform: translateY(100%); }
        }
      `}</style>
    </div>
  ) : null;

  // ── Personality view ─────────────────────────────────────────────────────────

  if (view === 'personality' && selectedStudent) {
    return (
      <><EditorialShell theme={designTheme}>
        <PersonalityQuestionnaire
          student={selectedStudent}
          onComplete={theme => {
            setStudentThemes(prev => ({ ...prev, [selectedStudent.id]: theme }));
            navigate(() => { setView('student'); setStudentTab('space'); setTabVisible(true); });
          }}
          onBack={() => navigate(() => { setView('roster'); setFocusedRosterId(selectedStudent.id); setRosterHovered(false); })}
        />
      </EditorialShell>{Curtain}</>
    );
  }

  // ── Assessment view ──────────────────────────────────────────────────────────

  if (view === 'assessment' && selectedStudent) {
    const [fg] = getAvatarColors(selectedStudent.name);
    return (
      <><EditorialShell theme={designTheme}>
        <AssessmentView
          student={selectedStudent}
          fg={fg}
          onComplete={(ratings, habits, saAnswers) => applyAssessment(selectedStudent.id, ratings, habits, saAnswers)}
          onBack={() => navigate(() => { setView('roster'); setFocusedRosterId(selectedStudent.id); setRosterHovered(false); })}
        />
      </EditorialShell>{Curtain}</>
    );
  }

  // ── Roster ───────────────────────────────────────────────────────────────────

  if (view === 'roster') {
    function openStudent(id: string)   { navigate(() => { setSelectedStudentId(id); setView('student');     setStudentTab('review'); setTabVisible(true); setFocusedRosterId(null); setRosterHovered(false); }); }
    function goAssessment(id: string)  { navigate(() => { setSelectedStudentId(id); setView('assessment');   setFocusedRosterId(null); setRosterHovered(false); }); }
    function goDevelopment(id: string) { navigate(() => { setSelectedStudentId(id); setView('development');  setFocusedRosterId(null); setRosterHovered(false); }); }
    function goPersonality(id: string) { navigate(() => { setSelectedStudentId(id); setView('personality');  setFocusedRosterId(null); setRosterHovered(false); }); }

    const focusedStudent = students.find(s => s.id === focusedRosterId) ?? null;

    // Four radial options — all in the design theme palette, no emojis
    const RADIAL: { label: string; icon: React.ReactNode; angle: number; action: () => void; secondary?: boolean }[] = focusedStudent ? [
      { label: 'Dashboard',   icon: <ChevronRight size={14} />, angle: -90, action: () => openStudent(focusedStudent.id) },
      { label: 'Assessment',  icon: <Target size={14} />,       angle:   0, action: () => goAssessment(focusedStudent.id),  secondary: true },
      { label: 'Growth',      icon: <TrendingUp size={14} />,   angle: 180, action: () => goDevelopment(focusedStudent.id), secondary: true },
      { label: 'Personalize', icon: <Pencil size={14} />,       angle:  90, action: () => goPersonality(focusedStudent.id), secondary: true },
    ] : [];

    return (
      <><EditorialShell theme={designTheme} className="min-h-screen" style={{ position: 'relative', cursor: 'none' }}>

        {/* ── Custom cursor ── */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: cursor.pos.x,
            top: cursor.pos.y,
            width: cursor.hovering ? 36 : 10,
            height: cursor.hovering ? 36 : 10,
            marginLeft: cursor.hovering ? -18 : -5,
            marginTop: cursor.hovering ? -18 : -5,
            borderRadius: '50%',
            backgroundColor: cursor.hovering ? 'transparent' : designTheme.main.heading,
            border: cursor.hovering ? `1.5px solid ${designTheme.main.heading}` : 'none',
            transition: 'width 200ms cubic-bezier(0.34,1.56,0.64,1), height 200ms cubic-bezier(0.34,1.56,0.64,1), margin 200ms cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'none',
            zIndex: 9999,
            mixBlendMode: 'multiply',
          }} />

        {/* ── Focus overlay: selected name centered, radial menu on hover ── */}
        {focusedRosterId && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: designTheme.main.bg, zIndex: 50, cursor: 'none' }}
            onClick={() => { setFocusedRosterId(null); setRosterHovered(false); }}>

            {/* Centered name + radial */}
            <div
              className="relative flex items-center justify-center select-none"
              style={{ padding: '80px' }}
              onMouseEnter={() => setRosterHovered(true)}
              onMouseLeave={() => setRosterHovered(false)}
              onClick={e => e.stopPropagation()}>

              {/* The name */}
              <div className="text-center">
                <h2 className="font-black leading-none"
                  style={{
                    fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                    color: designTheme.main.heading,
                    letterSpacing: '-0.03em',
                    cursor: 'none',
                  }}>
                  <AnimatedText text={focusedStudent?.name ?? ''} animKey={focusedRosterId} stagger={32} />
                </h2>
                {focusedStudent?.grade && (
                  <p className="text-sm font-semibold uppercase tracking-widest mt-2"
                    style={{ color: designTheme.main.body, opacity: 0.4 }}>
                    {focusedStudent.grade} grade
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: designTheme.main.body, opacity: 0.3 }}>
                  hover to navigate
                </p>
              </div>

              {/* Radial buttons — elliptical orbit so horizontal items clear the wide name */}
              {RADIAL.map((item, i) => {
                const rad = (item.angle * Math.PI) / 180;
                const rx = 290; // wider horizontal axis
                const ry = 175; // tighter vertical axis
                const x = Math.cos(rad) * rx;
                const y = Math.sin(rad) * ry;
                return (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${rosterHovered ? 1 : 0.2})`,
                      opacity: rosterHovered ? 1 : 0,
                      transition: `transform 600ms cubic-bezier(0.34,1.56,0.64,1) ${i * 100}ms, opacity 400ms ease ${i * 100}ms`,
                      pointerEvents: rosterHovered ? 'auto' : 'none',
                    }}>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: item.secondary ? 'transparent' : designTheme.main.btn,
                      border: item.secondary ? `1.5px solid ${designTheme.main.heading}` : 'none',
                      color: item.secondary ? designTheme.main.heading : designTheme.main.btnText,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 120ms',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                      {item.icon}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: designTheme.main.heading,
                      opacity: 0.7,
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Back hint */}
            <p style={{
              position: 'absolute', bottom: 32,
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: designTheme.main.body, opacity: 0.3,
            }}>
              Click anywhere to go back
            </p>
          </div>
        )}

        {/* ── Gallery list ── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 48px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 56 }}>
            <div>
              <p style={{
                fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#000', opacity: 0.35, marginBottom: 10,
              }}>
                EF Dashboard
              </p>
              <h1 style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 300,
                letterSpacing: '-0.04em', lineHeight: 1, color: '#000', margin: 0,
              }}>
                Students
              </h1>
            </div>
            {/* Theme switcher */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#000', opacity: 0.35 }}>
                Theme
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {DESIGN_THEMES.map((t: DesignTheme) => (
                  <button key={t.id} onClick={() => setDesignTheme(t)} title={t.name}
                    style={{
                      width: 18, height: 18,
                      backgroundColor: t.sidebar.bg,
                      border: 'none',
                      outline: designTheme.id === t.id ? `2px solid ${t.main.accent}` : '2px solid transparent',
                      outlineOffset: '2px',
                      cursor: 'none',
                      transition: 'transform 150ms ease',
                    }} />
                ))}
              </div>
            </div>
          </div>

          {/* Name list — full-width typographic rows */}
          <div style={{ borderBottom: '1px solid #000' }}>
            {students.map(student => (
              <RosterTile
                key={student.id}
                student={student}
                onClick={() => { setFocusedRosterId(student.id); setRosterHovered(false); }}
              />
            ))}

            {/* Add student row */}
            {showAddStudent ? (
              <div style={{ borderTop: '1px solid #000', padding: '24px 0' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input
                    autoFocus
                    style={{
                      flex: 1, border: 'none', borderBottom: '1px solid #000',
                      padding: '6px 0', fontSize: '1rem', background: 'transparent',
                      color: '#000', outline: 'none',
                    }}
                    placeholder="Full name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStudent()} />
                  <input
                    style={{
                      width: 120, border: 'none', borderBottom: '1px solid #000',
                      padding: '6px 0', fontSize: '1rem', background: 'transparent',
                      color: '#000', outline: 'none',
                    }}
                    placeholder="Grade"
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStudent()} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button onClick={addStudent}
                    style={{
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: '#fff', background: '#000',
                      border: 'none', padding: '8px 20px', cursor: 'none',
                    }}>
                    Add
                  </button>
                  <button onClick={() => setShowAddStudent(false)}
                    style={{
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: '#000', background: 'transparent',
                      border: 'none', opacity: 0.4, cursor: 'none',
                    }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddStudent(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '22px 0',
                  backgroundColor: 'transparent', border: 'none',
                  borderTop: '1px solid #000',
                  cursor: 'none',
                  opacity: 0.35,
                  transition: 'opacity 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}>
                <Plus size={12} strokeWidth={2} style={{ color: '#000' }} />
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000',
                }}>
                  Add student
                </span>
              </button>
            )}
          </div>
        </div>
      </EditorialShell>{Curtain}</>
    );
  }

  // ── Student dashboard ────────────────────────────────────────────────────────

  if (view === 'student' && selectedStudent) {
    const student = selectedStudent;
    const theme = studentThemes[student.id] ?? null;
    const [avatarFg, avatarBg] = getAvatarColors(student.name);
    const s = getThemeStyles(theme, avatarFg, avatarBg);
    const firstName = student.name.split(' ')[0];
    const studentSessions = sessions.filter(s => s.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));
    const latestSession = studentSessions[studentSessions.length - 1];
    const studentHabits = habits.filter(h => h.studentId === student.id);
    const lastWeekEntry = getWeekEntry(student.id, lastWeek);
    const thisWeekEntry = getWeekEntry(student.id, thisWeek);
    const thisWeekObs = obligations.filter(o => o.studentId === student.id && o.weekStart === thisWeek);

    function addObligation() {
      if (!newObText.trim()) return;
      setObligations(prev => [...prev, { id: `ob-${Date.now()}`, studentId: student.id, weekStart: thisWeek, text: newObText.trim(), plannedDate: newObDate, plannedTime: newObTime, completed: false }]);
      setNewObText(''); setNewObDate(''); setNewObTime('');
    }

    function toggleOb(id: string) {
      setObligations(prev => prev.map(o => o.id === id ? { ...o, completed: !o.completed } : o));
    }

    function toggleLastGoal(id: string) {
      updateWeekEntry({ ...lastWeekEntry, goals: lastWeekEntry.goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g) });
    }

    function toggleLastHabit(habitId: string) {
      const checks = lastWeekEntry.habitChecks.includes(habitId)
        ? lastWeekEntry.habitChecks.filter(id => id !== habitId)
        : [...lastWeekEntry.habitChecks, habitId];
      updateWeekEntry({ ...lastWeekEntry, habitChecks: checks });
    }

    const prevCompleted = lastWeekEntry.goals.filter(g => g.completed).length + lastWeekEntry.habitChecks.length;
    const prevTotal = lastWeekEntry.goals.length + studentHabits.length;

    // ── Derive card/button style helpers from theme ──────────────────────────
    const cardStyle: React.CSSProperties = {
      backgroundColor: designTheme.main.card,
      border: `1px solid ${designTheme.main.cardBorder}`,
      padding: '20px',
    };
    const accent = designTheme.main.accent;

    return (
      <><EditorialShell theme={designTheme} className="h-screen flex flex-col overflow-hidden" style={{ background: designTheme.main.bg }}>

        {/* ── Top header ── */}
        <header style={{ backgroundColor: designTheme.sidebar.bg, borderBottom: `1px solid ${designTheme.sidebar.border}`, flexShrink: 0 }}>
          <div className="flex items-center gap-4 px-6 py-4">
            <button onClick={() => navigate(() => { setView('roster'); setFocusedRosterId(null); setRosterHovered(false); })}
              className="flex items-center gap-1.5 text-xs flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ color: designTheme.sidebar.text, opacity: 0.55 }}>
              <ArrowLeft size={13} /> All students
            </button>

            {/* Avatar */}
            <div className="w-10 h-10 flex items-center justify-center text-base font-black flex-shrink-0"
              style={{ backgroundColor: `${designTheme.sidebar.accent}25`, color: designTheme.sidebar.accent }}>
              {student.name[0]}
            </div>

            {/* Name + grade + tagline */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg leading-none" style={{ color: designTheme.sidebar.text }}>{student.name}</h1>
                {theme?.vibe && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                    style={{ backgroundColor: `${designTheme.sidebar.accent}25`, color: designTheme.sidebar.accent }}>
                    {theme.vibe}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: designTheme.sidebar.text, opacity: 0.5 }}>
                {student.grade && `${student.grade} · `}{studentSessions.length} sessions · {studentHabits.length} habits
                {theme?.tagline && <span className="italic ml-2" style={{ color: designTheme.sidebar.accent }}>"{theme.tagline}"</span>}
              </p>
            </div>

            {/* EF skill bars (compact) */}
            {latestSession && (
              <div className="hidden md:flex gap-4 ml-4">
                {EF_AREAS.map(area => (
                  <div key={area.key} className="w-20">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px]" style={{ color: designTheme.sidebar.text, opacity: 0.5 }}>{area.label.split(' ')[0]}</span>
                      <span className="text-[10px] font-bold" style={{ color: designTheme.sidebar.accent }}>{latestSession.efRatings[area.key]}</span>
                    </div>
                    <SkillBar value={latestSession.efRatings[area.key]} color={designTheme.sidebar.accent} />
                  </div>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => navigate(() => setView('development'))}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: designTheme.sidebar.accent, color: '#fff' }}>
                <TrendingUp size={12} /> Growth
              </button>
              <button onClick={() => navigate(() => setView('assessment'))}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition-opacity hover:opacity-70"
                style={{ borderColor: `${designTheme.sidebar.text}30`, color: designTheme.sidebar.text, opacity: 0.75 }}>
                <Target size={12} /> Assessment
              </button>
              <button onClick={() => navigate(() => setView('personality'))}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition-opacity hover:opacity-70"
                style={{ borderColor: `${designTheme.sidebar.text}30`, color: designTheme.sidebar.text, opacity: 0.75 }}>
                <Smile size={12} /> {theme ? 'Redo theme' : 'Personalize'}
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex px-6" style={{ borderTop: `1px solid ${designTheme.sidebar.border}` }}>
            {([
              ['review', 'Last week'],
              ['week',   'This week'],
              ['focus',  'Focus tools'],
              ['space',  'My space'],
            ] as [StudentTab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => switchStudentTab(key)}
                className="px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
                style={studentTab === key
                  ? { borderColor: designTheme.sidebar.accent, color: designTheme.sidebar.accent }
                  : { borderColor: 'transparent', color: designTheme.sidebar.text, opacity: 0.5 }}>
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: designTheme.main.bg }}>
          <div style={{ opacity: tabVisible ? 1 : 0, transition: 'opacity 150ms ease' }}>

            {studentTab === 'review' && (
              <div style={cardStyle}>
                <div className="flex items-start justify-between mb-3">
                  <SectionLabel title="Last week's goals & habits" sub={weekLabel(lastWeek)} />
                  <button onClick={() => navigate(() => setView('development'))}
                    className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 hover:opacity-80 flex-shrink-0 ml-3"
                    style={{ backgroundColor: designTheme.main.btn, color: designTheme.main.btnText }}>
                    Overall development <ChevronRight size={12} />
                  </button>
                </div>
                {prevTotal === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">Nothing was set for last week yet.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 mb-3 text-sm" style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}20` }}>
                      <span className="font-semibold text-stone-700">{prevCompleted}/{prevTotal} completed</span>
                      <span className="text-xs font-medium" style={{ color: designTheme.main.body }}>{prevCompleted === prevTotal ? 'All done' : prevCompleted > prevTotal / 2 ? 'Strong week' : 'Keep at it'}</span>
                    </div>
                    {lastWeekEntry.goals.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: designTheme.main.body, opacity: 0.5 }}>Goals</p>
                        <div className="space-y-1.5">
                          {lastWeekEntry.goals.map(g => (
                            <div key={g.id} onClick={() => toggleLastGoal(g.id)} className="flex items-center gap-2.5 cursor-pointer group">
                              {g.completed ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> : <Circle size={16} className="text-stone-300 group-hover:text-stone-400 flex-shrink-0 transition-colors" />}
                              <span className={`text-sm ${g.completed ? 'line-through text-stone-400' : ''}`} style={{ color: g.completed ? undefined : designTheme.main.body }}>{g.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {studentHabits.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 mt-3" style={{ color: designTheme.main.body, opacity: 0.5 }}>Habits</p>
                        <div className="space-y-1.5">
                          {studentHabits.map(h => {
                            const checked = lastWeekEntry.habitChecks.includes(h.id);
                            return (
                              <div key={h.id} onClick={() => toggleLastHabit(h.id)} className="flex items-center gap-2.5 cursor-pointer group">
                                {checked ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> : <Circle size={16} className="text-stone-300 group-hover:text-stone-400 flex-shrink-0 transition-colors" />}
                                <span className={`text-sm ${checked ? 'line-through text-stone-400' : ''}`} style={{ color: checked ? undefined : designTheme.main.body }}>{h.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {studentTab === 'week' && (
              <div style={cardStyle}>
                <SectionLabel title="Week ahead" sub={weekLabel(thisWeek)} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: designTheme.main.body, opacity: 0.5 }}>What's coming up</p>
                    <div className="space-y-1.5 mb-2">
                      {thisWeekObs.map(ob => {
                        const calUrl = googleCalendarUrl(ob.text, ob.plannedDate, ob.plannedTime);
                        return (
                          <div key={ob.id} className="flex items-start gap-2 group">
                            <div onClick={() => toggleOb(ob.id)} className="flex items-start gap-2 flex-1 cursor-pointer min-w-0">
                              {ob.completed ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <Circle size={15} className="text-stone-300 group-hover:text-stone-400 flex-shrink-0 mt-0.5 transition-colors" />}
                              <div className="min-w-0">
                                <p className={`text-sm leading-tight ${ob.completed ? 'line-through text-stone-400' : ''}`} style={{ color: ob.completed ? undefined : designTheme.main.body }}>{ob.text}</p>
                                {(ob.plannedDate || ob.plannedTime) && (
                                  <p className="text-[11px] mt-0.5" style={{ color: designTheme.main.body, opacity: 0.5 }}>
                                    {ob.plannedDate && fmtDate(ob.plannedDate)}{ob.plannedDate && ob.plannedTime ? ' · ' : ''}{ob.plannedTime}
                                  </p>
                                )}
                              </div>
                            </div>
                            {calUrl && (
                              <a href={calUrl} target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0 p-1 transition-opacity hover:opacity-100 mt-0.5"
                                style={{ color: accent, opacity: 0.5 }}
                                title="Add to Google Calendar">
                                <CalendarPlus size={14} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <input className="w-full border px-2.5 py-1.5 text-xs outline-none"
                      style={{ borderColor: designTheme.main.cardBorder, backgroundColor: designTheme.main.card, color: designTheme.main.body }}
                      placeholder="Add assignment or obligation..."
                      value={newObText} onChange={e => setNewObText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addObligation()} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: designTheme.main.body, opacity: 0.5 }}>When I'll do it</p>
                    <div className="space-y-2">
                      <input type="date" className="w-full border px-2.5 py-1.5 text-xs outline-none"
                        style={{ borderColor: designTheme.main.cardBorder, backgroundColor: designTheme.main.card, color: designTheme.main.body }}
                        value={newObDate} onChange={e => setNewObDate(e.target.value)} />
                      <input type="time" className="w-full border px-2.5 py-1.5 text-xs outline-none"
                        style={{ borderColor: designTheme.main.cardBorder, backgroundColor: designTheme.main.card, color: designTheme.main.body }}
                        value={newObTime} onChange={e => setNewObTime(e.target.value)} />
                      <button onClick={addObligation}
                        className="w-full py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                        style={{ backgroundColor: newObText.trim() ? designTheme.main.btn : '#d6d3d1', color: designTheme.main.btnText }}>
                        Add to week
                      </button>
                      <p className="text-[11px] flex items-center gap-1" style={{ color: designTheme.main.body, opacity: 0.45 }}>
                        <CalendarPlus size={11} /> Set a date to enable Google Calendar export
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {studentTab === 'focus' && (
              <div style={cardStyle}>
                <div className="flex gap-px mb-5" style={{ backgroundColor: designTheme.main.cardBorder }}>
                  {([['pomodoro', 'Pomodoro timer'], ['chunking', 'Break it down']] as [FocusTab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setFocusTab(key)}
                      className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                      style={focusTab === key
                        ? { backgroundColor: designTheme.main.btn, color: designTheme.main.btnText }
                        : { backgroundColor: designTheme.main.card, color: designTheme.main.body }}>
                      {label}
                    </button>
                  ))}
                </div>
                {focusTab === 'pomodoro' && <PomodoroTimer />}
                {focusTab === 'chunking' && (
                  <ChunkingTool
                    studentId={student.id}
                    projects={chunkProjects}
                    onSave={p => setChunkProjects(prev => {
                      const exists = prev.some(x => x.id === p.id);
                      return exists ? prev.map(x => x.id === p.id ? p : x) : [...prev, p];
                    })}
                  />
                )}
              </div>
            )}

            {studentTab === 'space' && (
              <div className="space-y-4">
                <div style={cardStyle}>
                  <SectionLabel title="My space" sub="Yours to customize" />
                  <CustomWidget
                    studentId={student.id}
                    choice={widgetChoices[student.id] ?? null}
                    onChoose={w => setWidgetChoices(prev => ({ ...prev, [student.id]: w }))}
                    data={widgetData[student.id] ?? {}}
                    onSave={d => setWidgetData(prev => ({ ...prev, [student.id]: d }))}
                  />
                </div>

                {theme ? (
                  <div style={cardStyle}>
                    <ThemeCustomizer
                      theme={theme}
                      onSave={t => setStudentThemes(prev => ({ ...prev, [student.id]: t }))}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(() => setView('personality'))}
                    className="w-full border-2 border-dashed p-6 text-sm font-medium transition-opacity hover:opacity-70 flex flex-col items-center gap-2"
                    style={{ borderColor: `${accent}50`, color: accent }}>
                    <Smile size={22} />
                    <span>Personalize this dashboard with AI</span>
                    <span className="text-xs font-normal opacity-70">Answer a few questions to generate a theme that's uniquely yours</span>
                  </button>
                )}
              </div>
            )}

          </div>
        </main>
      </EditorialShell>{Curtain}</>
    );
  }

  // ── Development screen ───────────────────────────────────────────────────────

  if (view === 'development' && selectedStudent) {
    const student = selectedStudent;
    const [fg] = getAvatarColors(student.name);
    const studentSessions = sessions.filter(s => s.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));
    const latestSession = studentSessions[studentSessions.length - 1];

    const chartData = studentSessions.map(s => ({
      date: fmtDate(s.date),
      'Getting Started': s.efRatings.taskInitiation,
      'Focus & Memory': s.efRatings.workingMemory,
      'Managing Time': s.efRatings.timeManagement,
    }));

    const strengths = latestSession
      ? EF_AREAS.map(area => ({ area, value: latestSession.efRatings[area.key] })).sort((a, b) => b.value - a.value)
      : [];

    const improvements = studentSessions.length >= 2
      ? EF_AREAS.map(area => ({ area, delta: latestSession.efRatings[area.key] - studentSessions[0].efRatings[area.key] })).filter(x => x.delta > 0)
      : [];

    return (
      <><EditorialShell theme={designTheme} className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(() => { setView('roster'); setFocusedRosterId(selectedStudentId); setRosterHovered(false); })} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6"><ArrowLeft size={15} /> Back to home</button>
          <h1 className="text-xl font-bold text-stone-800 mb-1">My growth — {student.name}</h1>
          <p className="text-sm text-stone-500 mb-6">{studentSessions.length} sessions together</p>

          {improvements.length > 0 && (
            <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: `${fg}10`, border: `1.5px solid ${fg}20` }}>
              <p className="font-semibold text-stone-800 text-sm">Top improvement: <span style={{ color: fg }}>{improvements[0].area.label}</span></p>
              <p className="text-xs text-stone-500 mt-0.5">Up {improvements[0].delta} {improvements[0].delta === 1 ? 'level' : 'levels'} since first session</p>
            </div>
          )}

          <div className="space-y-3 mb-5">
            {strengths.map(({ area, value }) => {
              const delta = studentSessions.length > 1 ? value - studentSessions[0].efRatings[area.key] : 0;
              return (
                <Card key={area.key} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: area.color + '60' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-stone-800">{area.label}</p>
                        <span className="text-xs font-semibold" style={{ color: area.color }}>Level {value}/5</span>
                      </div>
                      <SkillBar value={value} color={area.color} />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-stone-500">{EF_LEVEL_LABELS[value]}</p>
                        {delta > 0 && <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5"><TrendingUp size={11} /> +{delta} since start</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {chartData.length > 1 && (
            <Card className="p-5 mb-5">
              <p className="text-sm font-bold text-stone-700 mb-4">Growth over time</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a8a29e' }} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: '#a8a29e' }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} formatter={v => [EF_LEVEL_LABELS[Number(v)] ?? v, '']} />
                  {EF_AREAS.map(area => (
                    <Line key={area.key} type="monotone" dataKey={area.label} stroke={area.color} strokeWidth={2.5} dot={{ r: 4, fill: area.color, strokeWidth: 0 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card className="p-5">
            <p className="text-sm font-bold text-stone-700 mb-4">Session history</p>
            <div className="space-y-4">
              {[...studentSessions].reverse().map((s, i) => (
                <div key={s.id} className="relative pl-5">
                  {i < studentSessions.length - 1 && <div className="absolute left-[7px] top-6 bottom-0 w-px bg-stone-100" />}
                  <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-stone-200 bg-white" />
                  <p className="text-xs font-semibold text-stone-500 mb-1">{fmtDateLong(s.date)}</p>
                  {s.notes && <p className="text-sm text-stone-600 mb-1.5 leading-relaxed">{s.notes}</p>}
                  <div className="flex gap-3">{EF_AREAS.map(area => (<div key={area.key} className="flex items-center gap-1"><span className="text-xs text-stone-400">{area.label.split(' ')[0]}</span><span className="text-xs font-bold" style={{ color: area.color }}>{s.efRatings[area.key]}</span></div>))}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </EditorialShell>{Curtain}</>
    );
  }

  return null;
}
