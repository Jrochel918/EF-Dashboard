'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Plus, CheckCircle2, Circle, ChevronRight, X, Trash2, Star,
  TrendingUp, ArrowLeft, Timer, Scissors, Smile, FileText,
  Heart, Target, ChevronDown, Play, Pause, RotateCcw, Pencil, CalendarPlus,
} from 'lucide-react';
import { EditorialShell, DESIGN_THEMES, DesignTheme } from '../design-system';
import { createClient } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

type EFKey = 'taskInitiation' | 'workingMemory' | 'timeManagement';

const EF_AREAS: { key: EFKey; label: string; color: string; bg: string }[] = [
  { key: 'taskInitiation', label: 'Getting Started', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'workingMemory', label: 'Focus & Memory', color: '#0369a1', bg: '#f0f9ff' },
  { key: 'timeManagement', label: 'Managing Time', color: '#047857', bg: '#f0fdf4' },
];

const EF_LEVEL_LABELS: Record<number, string> = {
  1: 'Just starting', 2: 'Building', 3: 'Getting there',
  4: 'Strong', 5: 'Owning it',
};

const AVATAR_COLORS: [string, string][] = [
  ['#7c3aed', '#ddd6fe'], ['#0369a1', '#bae6fd'], ['#047857', '#bbf7d0'],
  ['#b45309', '#fde68a'], ['#be185d', '#fce7f3'], ['#1d4ed8', '#bfdbfe'],
];

type Task = { id: string; text: string; completed: boolean };
type Session = { id: string; studentId: string; date: string; efRatings: Record<EFKey, number>; tasks: Task[]; notes: string; selfRating?: number; selfNote?: string; motivationLevel?: number };
type Student = { id: string; name: string; grade: string };
type Habit = { id: string; studentId: string; text: string };
type WeekGoal = { id: string; text: string; completed: boolean };
type WeekEntry = { id: string; studentId: string; weekStart: string; goals: WeekGoal[]; habitChecks: string[]; planNotes: string };
type Obligation = { id: string; studentId: string; weekStart: string; text: string; plannedDate: string; plannedTime: string; completed: boolean };
type WidgetType = 'mood' | 'braindump' | 'gratitude' | 'personal-goal' | null;
type ChunkStep = { id: string; text: string; done: boolean };
type ChunkProject = { id: string; studentId: string; name: string; dueDate: string; steps: ChunkStep[] };
type MoodEntry = { date: string; level: number; note: string };
type ThemePreset = 'minimal' | 'bold' | 'cozy' | 'dark' | 'creative' | 'structured' | 'pixel';
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
  customRadialLabel?: string;
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
  pixel:      { label: 'Pixel',      desc: 'Playful & alive',      swatch: '#fde68a', cardRadius: '4px',   buttonRadius: '2px',  avatarRadius: '0px',  shadow: '3px 3px 0 rgba(0,0,0,0.18)',        tabStyle: 'pill',      sidebarAccent: true,  defaultLayout: 'sidebar' },
};

// ── Pixel critters ─────────────────────────────────────────────────────────────
// Each row is 12 chars wide ('1' = filled pixel, '0' = empty). Rendered 2×2px per cell.
const CRITTER_PIXELS: string[][] = [
  // 0: PUDGE — chubby owl face, front-on
  ['000111111000','011111111110','111111111111',
   '110011001100','110011001100','111111111111',
   '110000000011','111111111111','011111111110',
   '000111111000','000110011000','000110011000'],
  // 1: DASH — bird running to the right
  ['000011110000','000111111100','001111111111',
   '011111111000','011111111000','001111110000',
   '000110000000','000110000000','001111000000'],
  // 2: SPOOK — ghost with jagged base
  ['001111111100','011111111110','111111111111',
   '110011001111','110100010011','111111111111',
   '011111111110','011101011110','010101010110'],
  // 3: CLANK — blocky robot head + body
  ['001111111100','011111111110','111111111111',
   '111011011111','111111111111','001111111100',
   '001111111100','001100110000','001100110000','001100110000'],
  // 4: BIRB — small round bird
  ['000001110000','000011111000','000011111000',
   '000011111000','001111111110','001111111110',
   '000111111100','000011110000','000001100000','000011100000'],
  // 5: WADDLE — penguin waddling
  ['000111111000','001111111100','011111111110',
   '011000000110','011111111110','001111111100',
   '011111111110','011111111110','001111111100',
   '000011100000','000001000000'],
  // 6: SNUG — hedgehog/bear, spiky top
  ['000111111000','010111111010','111111111111',
   '110111111011','110111111011','111111111111',
   '011111111110','001111111100','000110011000','000110011000'],
  // 7: SHROOM — mushroom creature
  ['000111111000','001111111100','011111111110',
   '111111111111','011111111110','001111111100',
   '000111111000','000111111000','000111111000',
   '000110011000','001111111100'],
  // 8: BOPPA — round with antenna
  ['000001000000','000011100000','000111111000',
   '011111111110','111111111111','110011001100',
   '110011001100','111111111111','110000000011',
   '111111111111','011111111110','000110011000'],
  // 9: ZIPPY — fast critter with speed lines
  ['111100011110','111100011110','000000011110',
   '000001111110','000111111110','001111111100',
   '011111111000','111111100000','111111100000',
   '111100000000'],
  // 10: BUBS — round with big eyes
  ['001111111100','011111111110','111111111111',
   '100110011001','100110011001','111111111111',
   '111111111111','110001100011','011111111110',
   '001111111100','000011000000','000100100000'],
  // 11: FRIZZ — spiked energy ball
  ['010001000100','001111111000','011111111110',
   '111111111111','111111111111','011111111110',
   '011111111110','111111111111','001111111100',
   '000111111000','010001000100'],
];

const CRITTER_NAMES = ['Pudge','Dash','Spook','Clank','Birb','Waddle','Snug','Shroom','Boppa','Zippy','Bubs','Frizz'];

function critterSVG(rows: string[]): string {
  const rects: string[] = [];
  rows.forEach((row, y) => {
    let startX = -1;
    for (let x = 0; x <= 12; x++) {
      const filled = x < 12 && row[x] === '1';
      if (filled && startX === -1) { startX = x; }
      else if (!filled && startX !== -1) {
        rects.push(`<rect x="${startX * 2}" y="${y * 2}" width="${(x - startX) * 2}" height="2"/>`);
        startX = -1;
      }
    }
  });
  return rects.join('');
}

function getCritterIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return hash % CRITTER_PIXELS.length;
}

function PixelAvatar({ name, size = 40, color = '#000', bounce = true }: { name: string; size?: number; color?: string; bounce?: boolean }) {
  const idx = getCritterIndex(name);
  const rows = CRITTER_PIXELS[idx];
  const viewH = rows.length * 2;
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: bounce ? 'pixelBounce 2s ease-in-out infinite' : 'none' }}>
      <svg viewBox={`0 0 24 ${viewH}`} width={size} height={size} fill={color}
        style={{ imageRendering: 'pixelated', display: 'block' }}
        dangerouslySetInnerHTML={{ __html: critterSVG(rows) }} />
    </div>
  );
}

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
      const ease = 1;
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
  student, onClick, lastSession, trend,
}: {
  student: Student;
  onClick: () => void;
  lastSession?: Session;
  trend?: 'up' | 'flat' | 'down' | null;
}) {
  const [hoverCount, setHoverCount] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#d97706';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%',
        padding: '22px 0',
        backgroundColor: '#ffffff',
        border: 'none',
        borderTop: '1px solid #000000',
        cursor: 'none',
        textAlign: 'left',
      }}
      onMouseEnter={() => { setIsHovered(true); setHoverCount(c => c + 1); }}
      onMouseLeave={() => setIsHovered(false)}>
      {/* Name */}
      <span style={{
        fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: '-0.025em',
        color: '#000000',
        opacity: isHovered ? 0.4 : 1,
        transition: 'opacity 200ms ease',
        display: 'block',
      }}>
        <AnimatedText text={student.name} animKey={hoverCount} stagger={18} />
      </span>
      {/* Right side: trend dot + last session + grade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, marginLeft: '2rem', opacity: isHovered ? 0.3 : 1, transition: 'opacity 200ms ease' }}>
        {lastSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {trend && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: trendColor, flexShrink: 0 }} title={trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs attention' : 'Holding steady'} />
            )}
            <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#000', opacity: 0.4 }}>
              {fmtDate(lastSession.date)}
            </span>
          </div>
        )}
        {student.grade && (
          <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', opacity: 0.35 }}>
            {student.grade}
          </span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarginBugs — tiny pixel critters crawling on the left/right page edges
// ─────────────────────────────────────────────────────────────────────────────
function MarginBugs({ names, color = '#000', opacity = 0.28 }: { names: string[]; color?: string; opacity?: number }) {
  const left  = names.filter((_, i) => i % 2 === 0);
  const right = names.filter((_, i) => i % 2 === 1);

  function top(name: string, i: number, total: number): string {
    const spread = 20 + (i / Math.max(total - 1, 1)) * 55;
    const jitter = (name.charCodeAt(0) % 9) - 4;
    return `${spread + jitter}%`;
  }

  function delay(i: number) { return `${((i * 0.37) % 1.4).toFixed(2)}s`; }

  return (
    <>
      {left.map((name, i) => (
        <div key={`l-${name}`} style={{
          position: 'fixed', left: 10, top: top(name, i, left.length),
          pointerEvents: 'none', zIndex: 5, opacity,
          animation: `pixelBounce ${1.4 + (i % 3) * 0.4}s ease-in-out infinite`,
          animationDelay: delay(i),
        }}>
          <PixelAvatar name={name} size={13} color={color} bounce={false} />
        </div>
      ))}
      {right.map((name, i) => (
        <div key={`r-${name}`} style={{
          position: 'fixed', right: 10, top: top(name, i, right.length),
          pointerEvents: 'none', zIndex: 5, opacity,
          animation: `pixelBounce ${1.4 + (i % 3) * 0.4}s ease-in-out infinite`,
          animationDelay: delay(i + left.length),
        }}>
          <PixelAvatar name={name} size={13} color={color} bounce={false} />
        </div>
      ))}
    </>
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
  return <div onClick={onClick} className={`bg-white border border-neutral-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}>{children}</div>;
}
function SkillBar({ value, color }: { value: number; color: string }) {
  return (
    <div>
      <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(v => <div key={v} className="flex-1" style={{ height: 6, backgroundColor: v <= value ? color : '#e7e5e4', borderRadius: 2 }} />)}</div>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color, opacity: 0.8 }}>{EF_LEVEL_LABELS[value]}</span>
    </div>
  );
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
  const r = 54, circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center py-8">
      {/* Mode toggle — editorial pill-less tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000', marginBottom: 40, width: '100%', maxWidth: 260 }}>
        {(['work', 'break'] as const).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '8px 0', fontSize: '0.625rem', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              marginBottom: -1, backgroundColor: 'transparent', border: 'none',
              borderBottom: mode === m ? '2px solid #000' : '2px solid transparent',
              color: mode === m ? '#000' : 'rgba(0,0,0,0.35)',
              cursor: 'pointer',
            }}>
            {m === 'work' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>

      {/* Timer ring — black stroke on light grey track */}
      <div style={{ position: 'relative', width: 144, height: 144, marginBottom: 40 }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f0f0f0" strokeWidth="6" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#000" strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.04em', color: '#000' }}>{mins}:{secs}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>
            {mode === 'work' ? 'focus' : 'break'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={toggle}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', backgroundColor: '#000', color: '#fff', border: 'none', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset}
          style={{ padding: '10px 14px', backgroundColor: 'transparent', border: '1px solid #000', color: '#000', cursor: 'pointer' }}>
          <RotateCcw size={14} />
        </button>
      </div>

      <p style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', marginTop: 24, textAlign: 'center', maxWidth: 260 }}>
        25 minutes of focus, then a 5-minute break.
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
      <button onClick={() => setActive(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20 }}>
        <ArrowLeft size={11} /> All projects
      </button>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#000', marginBottom: 2 }}>{active.name}</p>
        {active.dueDate && <p style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)' }}>Due {fmtDate(active.dueDate)}</p>}
        <div style={{ height: 2, backgroundColor: '#eee', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: '#000', width: `${(active.steps.filter(s => s.done).length / active.steps.length) * 100}%`, transition: 'width 400ms ease' }} />
        </div>
        <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{active.steps.filter(s => s.done).length} of {active.steps.length} steps done</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {active.steps.map(step => (
          <div key={step.id} onClick={() => toggleStep(step.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid', borderColor: step.done ? '#000' : '#e5e5e5', backgroundColor: step.done ? '#000' : '#fff', cursor: 'pointer', transition: 'all 180ms ease' }}>
            {step.done
              ? <CheckCircle2 size={15} style={{ color: '#fff', flexShrink: 0 }} />
              : <Circle size={15} style={{ color: '#ccc', flexShrink: 0 }} />}
            <span style={{ fontSize: '0.85rem', textDecoration: step.done ? 'line-through' : 'none', color: step.done ? 'rgba(255,255,255,0.7)' : '#000' }}>{step.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input style={{ flex: 1, border: '1px solid #ccc', borderBottom: '1px solid #000', padding: '7px 10px', fontSize: '0.8rem', outline: 'none', backgroundColor: 'transparent' }}
          placeholder="Add a step…" value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()} />
        <button onClick={addStep} style={{ padding: '7px 12px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={13} /></button>
      </div>
    </div>
  );

  return (
    <div>
      {mine.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {mine.map(p => (
            <div key={p.id} onClick={() => setActive(p)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #e5e5e5', cursor: 'pointer', transition: 'border-color 150ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e5e5')}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000' }}>{p.name}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)' }}>{p.steps.filter(s => s.done).length}/{p.steps.length} steps · {p.dueDate ? `Due ${fmtDate(p.dueDate)}` : 'No due date'}</p>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(0,0,0,0.3)' }} />
            </div>
          ))}
        </div>
      )}
      {creating ? (
        <div style={{ border: '1px solid #000', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input autoFocus style={{ width: '100%', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: '0.9rem', outline: 'none', backgroundColor: 'transparent' }}
            placeholder="Assignment name (e.g. History essay)" value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="date" style={{ width: '100%', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: '0.8rem', outline: 'none', backgroundColor: 'transparent' }}
            value={newDue} onChange={e => setNewDue(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={create} style={{ flex: 1, backgroundColor: '#000', color: '#fff', border: 'none', padding: '9px 0', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Break it down</button>
            <button onClick={() => setCreating(false)} style={{ padding: '9px 14px', backgroundColor: 'transparent', border: '1px solid #ccc', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          style={{ width: '100%', border: '1px dashed #ccc', padding: '16px 0', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'border-color 150ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#ccc')}>
          <Plus size={12} /> Add an assignment to break down
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

  const inputStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '1px solid #ccc', padding: '7px 0', fontSize: '0.85rem', outline: 'none', backgroundColor: 'transparent' };

  if (!choice || picking) return (
    <div>
      <p style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.45)', marginBottom: 16 }}>{picking ? 'Choose a different widget:' : 'What would you like here?'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {WIDGET_OPTIONS.map(o => (
          <button key={o.type} onClick={() => { onChoose(o.type); setPicking(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e5e5', backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e5e5')}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000' }}>{o.label}</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', marginTop: 3 }}>{o.desc}</span>
          </button>
        ))}
      </div>
      {picking && <button onClick={() => setPicking(false)} style={{ marginTop: 12, fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>}
    </div>
  );

  const opt = WIDGET_OPTIONS.find(o => o.type === choice)!;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000' }}>{opt.label}</span>
        <button onClick={() => setPicking(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={10} /> Change</button>
      </div>
      {choice === 'mood' && <MoodWidget data={data} onSave={onSave} />}
      {choice === 'braindump' && <BrainDumpWidget data={data} onSave={onSave} inputStyle={inputStyle} />}
      {choice === 'gratitude' && <GratitudeWidget data={data} onSave={onSave} inputStyle={inputStyle} />}
      {choice === 'personal-goal' && <PersonalGoalWidget data={data} onSave={onSave} inputStyle={inputStyle} />}
    </div>
  );
}

function MoodWidget({ data, onSave }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void }) {
  const entries = (data.entries as MoodEntry[]) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find(e => e.date === today);
  const [note, setNote] = useState(todayEntry?.note ?? '');
  const MOODS = ['😩', '😕', '😐', '😊', '😄'];
  const LABELS = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

  function save(level: number) {
    const updated = entries.filter(e => e.date !== today);
    onSave({ entries: [...updated, { date: today, level, note }] });
  }

  return (
    <div>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 16 }}>How are you feeling today?</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {MOODS.map((m, i) => (
          <button key={i} onClick={() => save(i + 1)}
            style={{ flex: 1, padding: '10px 0', fontSize: '1.4rem', border: '1px solid', borderColor: todayEntry?.level === i + 1 ? '#000' : '#e5e5e5', backgroundColor: todayEntry?.level === i + 1 ? '#000' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 150ms ease' }}
            title={LABELS[i]}>
            <span>{m}</span>
            <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: todayEntry?.level === i + 1 ? '#fff' : 'rgba(0,0,0,0.3)' }}>{LABELS[i]}</span>
          </button>
        ))}
      </div>
      {todayEntry && <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>{MOODS[todayEntry.level - 1]} {LABELS[todayEntry.level - 1]} — logged today</p>}
    </div>
  );
}

function BrainDumpWidget({ data, onSave, inputStyle }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void; inputStyle: React.CSSProperties }) {
  const [text, setText] = useState((data.text as string) ?? '');
  return (
    <div>
      <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', marginBottom: 10 }}>Write anything — no rules, no judgment.</p>
      <textarea style={{ ...inputStyle, borderBottom: 'none', border: '1px solid #e5e5e5', padding: '10px 12px', resize: 'none', minHeight: 100, display: 'block' }}
        rows={4} placeholder="What's on your mind?" value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onSave({ text })} />
    </div>
  );
}

function GratitudeWidget({ data, onSave, inputStyle }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void; inputStyle: React.CSSProperties }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['Something good that happened', 'Someone I appreciate', 'Something I\'m looking forward to'].map((ph, i) => (
        <input key={i} style={inputStyle} placeholder={ph} value={items[i]} onChange={e => update(i, e.target.value)} />
      ))}
    </div>
  );
}

function PersonalGoalWidget({ data, onSave, inputStyle }: { data: Record<string, unknown>; onSave: (d: Record<string, unknown>) => void; inputStyle: React.CSSProperties }) {
  const [goal, setGoal] = useState((data.goal as string) ?? '');
  const [why, setWhy] = useState((data.why as string) ?? '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input style={inputStyle} placeholder="My goal is…" value={goal} onChange={e => setGoal(e.target.value)} onBlur={() => onSave({ goal, why })} />
      <input style={inputStyle} placeholder="Because…" value={why} onChange={e => setWhy(e.target.value)} onBlur={() => onSave({ goal, why })} />
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

function ThemeCustomizer({ theme, onSave, studentName = '' }: { theme: StudentTheme; onSave: (t: StudentTheme) => void; studentName?: string }) {
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
                {key === 'pixel' ? (
                  <PixelAvatar name={studentName || 'Student'} size={24} color="#374151" bounce={false} />
                ) : (
                  <>
                    <div className="w-3 h-3 bg-stone-400 opacity-50" style={{ borderRadius: cfg.cardRadius }} />
                    <div className="w-5 h-2 bg-stone-400 opacity-30" style={{ borderRadius: cfg.cardRadius }} />
                  </>
                )}
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

type View = 'roster' | 'student' | 'assessment' | 'personality' | 'student-login';
type FocusTab = 'pomodoro' | 'chunking';
type StudentTab = 'looking-back' | 'looking-ahead' | 'growth' | 'drills' | 'space';

// ── Coach PIN ─────────────────────────────────────────────────────────────────
// Coach role is set via app_metadata.role = "coach" in Supabase dashboard.

// ── localStorage hook ──────────────────────────────────────────────────────────
// Two-pass: start with initial (safe for SSR), load from storage after hydration,
// then write only on real changes (skip the first write to avoid overwriting storage).
function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const isFirstWrite = useRef(true);

  // After hydration: read what's actually stored
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write on change, but skip the very first invocation (mount with initial)
  useEffect(() => {
    if (isFirstWrite.current) { isFirstWrite.current = false; return; }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}

export default function Page() {
  // isCoach: true when the signed-in user has app_metadata.role === 'coach' in Supabase
  // (set this via Dashboard → Authentication → Users → Raw App Meta Data)

  const [view, setView] = useState<View>('roster');
  const [focusTab, setFocusTab] = useState<FocusTab>('pomodoro');
  const [studentTab, setStudentTab] = useState<StudentTab>('looking-ahead');
  const [tabVisible, setTabVisible] = useState(true);
  const [students, setStudents] = useLocalStorage<Student[]>('ef-students', SEED_STUDENTS);
  const [sessions, setSessions] = useLocalStorage<Session[]>('ef-sessions', SEED_SESSIONS);
  const [habits, setHabits] = useLocalStorage<Habit[]>('ef-habits', SEED_HABITS);
  const [weekEntries, setWeekEntries] = useLocalStorage<WeekEntry[]>('ef-week-entries', SEED_WEEK_ENTRIES);
  const [obligations, setObligations] = useLocalStorage<Obligation[]>('ef-obligations', SEED_OBLIGATIONS);
  const [chunkProjects, setChunkProjects] = useLocalStorage<ChunkProject[]>('ef-chunk-projects', []);
  const [widgetChoices, setWidgetChoices] = useLocalStorage<Record<string, WidgetType>>('ef-widget-choices', {});
  const [widgetData, setWidgetData] = useLocalStorage<Record<string, Record<string, unknown>>>('ef-widget-data', {});
  const [studentThemes, setStudentThemes] = useLocalStorage<Record<string, StudentTheme>>('ef-student-themes', {});
  const [designThemeId, setDesignThemeId] = useLocalStorage<string>('ef-design-theme', DESIGN_THEMES[0].id);
  const designTheme = DESIGN_THEMES.find(t => t.id === designThemeId) ?? DESIGN_THEMES[0];
  const setDesignTheme = (t: DesignTheme) => setDesignThemeId(t.id);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [focusedRosterId, setFocusedRosterId] = useState<string | null>(null);
  const [rosterHovered, setRosterHovered] = useState(false);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radialVisibleRef = useRef(false);
  const cursor = useCursor();

  // ── Auth (Supabase) ──────────────────────────────────────────────────────────
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const supabase = React.useMemo(() => createClient(), []);
  // Derived from Supabase app_metadata — no extra fetch needed
  const isCoach = supabaseUser?.app_metadata?.role === 'coach';

  useEffect(() => {
    // Check existing session
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUser(data.user ?? null);
      if (data.user) {
        const role = data.user.app_metadata?.role;
        if (role === 'coach') {
          // Coach — stay on roster (default view)
          return;
        }
        // If a student is already logged in via Google, auto-match them
        if (data.user.email) {
          const emailPrefix = (data.user.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
          const matched = students.find(s => {
            const parts = s.name.toLowerCase().split(/\s+/);
            return emailPrefix === parts.join('') || emailPrefix === [...parts].reverse().join('');
          });
          if (matched) {
            setStudentMode(true);
            setSelectedStudentId(matched.id);
            setPrivacyAccepted(true);
          }
        }
      }
    });

    // Listen for sign-in / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      // Capture Google provider token for Calendar API use
      if (session?.provider_token) setGoogleToken(session.provider_token);
      if (session?.user) {
        const role = session.user.app_metadata?.role;
        if (role === 'coach') {
          // Coach signed in — go straight to roster
          navigate(() => setView('roster'));
        } else if (session.user.email) {
          // Try to match as a student
          const emailPrefix = (session.user.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
          const matched = students.find(s => {
            const parts = s.name.toLowerCase().split(/\s+/);
            const forward = parts.join('');
            const reverse = [...parts].reverse().join('');
            return emailPrefix === forward || emailPrefix === reverse;
          });
          if (matched) {
            setStudentMode(true);
            setSelectedStudentId(matched.id);
            setPrivacyAccepted(true);
            navigate(() => { setView('student'); setStudentTab('looking-ahead'); setTabVisible(true); });
          }
        }
      } else {
        // Signed out
        setStudentMode(false);
        setPrivacyAccepted(false);
        setGoogleToken(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // ── Quick session log ────────────────────────────────────────────────────────
  const [showLogSession, setShowLogSession] = useState(false);
  const [logDate, setLogDate] = useState('');
  const [logRatings, setLogRatings] = useState<Record<EFKey, number>>({ taskInitiation: 3, workingMemory: 3, timeManagement: 3 });
  const [logNotes, setLogNotes] = useState('');
  const [logMotivation, setLogMotivation] = useState(0);

  function openLogSession() {
    setLogDate(new Date().toISOString().slice(0, 10));
    setLogRatings({ taskInitiation: 3, workingMemory: 3, timeManagement: 3 });
    setLogNotes('');
    setLogMotivation(0);
    setShowLogSession(true);
  }

  function saveLogSession(studentId: string) {
    const session: Session = {
      id: `ses-${Date.now()}`,
      studentId,
      date: logDate || new Date().toISOString().slice(0, 10),
      efRatings: logRatings,
      tasks: [],
      notes: logNotes,
      motivationLevel: logMotivation || undefined,
    };
    setSessions(prev => [...prev, session]);
    setShowLogSession(false);
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/documents.readonly',
          ].join(' '),
        },
      });
      if (error) { setAuthError(error.message); setSigningIn(false); }
      // On success the page redirects — signingIn stays true until navigation
    } catch (e) {
      setAuthError(String(e));
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStudentMode(false);
    setPrivacyAccepted(false);
    navigate(() => setView('student-login'));
  };

  // ── Student login / mode ─────────────────────────────────────────────────────
  const [studentMode, setStudentMode] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useLocalStorage<boolean>('ef-privacy-accepted', false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // ── Google Calendar integration ──────────────────────────────────────────────
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [gcalAdding, setGcalAdding] = useState(false);
  const [gcalSuccess, setGcalSuccess] = useState(false);
  // Google Calendar token comes from the Supabase session (provider_token)
  // — GIS script no longer needed since Supabase handles Google OAuth

  // Clear timer & hide radial whenever focus changes
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    radialVisibleRef.current = false;
    setRosterHovered(false);
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [focusedRosterId]);

  // Call when mouse enters the name: shows the radial and starts 4s idle clock
  const showRadial = React.useCallback(() => {
    radialVisibleRef.current = true;
    setRosterHovered(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      radialVisibleRef.current = false;
      setRosterHovered(false);
    }, 4000);
  }, []);

  // Call on any mouse movement over the overlay: only extends timer if radial is already visible
  const keepRadialAlive = React.useCallback(() => {
    if (!radialVisibleRef.current) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      radialVisibleRef.current = false;
      setRosterHovered(false);
    }, 4000);
  }, []);

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

  // ── Google Calendar: direct event insert (no popup) ──────────────────────────
  async function addAllToGoogleCalendar(items: Obligation[]) {
    if (!googleToken) {
      // Token comes from Supabase session — prompt re-sign-in if missing
      await handleGoogleSignIn();
      return;
    }
    const withDate = items.filter(ob => ob.plannedDate && !ob.completed);
    if (withDate.length === 0) return;
    setGcalAdding(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const ob of withDate) {
      let body: Record<string, unknown>;
      if (ob.plannedTime) {
        const [h, m] = ob.plannedTime.split(':').map(Number);
        const endH = String(h + 1).padStart(2, '0');
        const mm   = String(m).padStart(2, '0');
        body = {
          summary: ob.text,
          start: { dateTime: `${ob.plannedDate}T${String(h).padStart(2,'0')}:${mm}:00`, timeZone: tz },
          end:   { dateTime: `${ob.plannedDate}T${endH}:${mm}:00`,                      timeZone: tz },
        };
      } else {
        const nextDay = new Date(ob.plannedDate + 'T12:00:00');
        nextDay.setDate(nextDay.getDate() + 1);
        body = {
          summary: ob.text,
          start: { date: ob.plannedDate },
          end:   { date: nextDay.toISOString().slice(0, 10) },
        };
      }
      try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.status === 401) { setGoogleToken(null); await handleGoogleSignIn(); break; }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Calendar API error:', res.status, err);
          setGcalAdding(false);
          setAuthError(`Calendar error ${res.status}: ${err?.error?.message ?? 'Unknown error'}`);
          return;
        }
      } catch (e) {
        console.error('Calendar fetch failed:', e);
        setGcalAdding(false);
        setAuthError('Network error adding to Calendar');
        return;
      }
    }
    setGcalAdding(false);
    setGcalSuccess(true);
    setTimeout(() => setGcalSuccess(false), 3500);
  }

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newObText, setNewObText] = useState('');
  const [newObDate, setNewObDate] = useState('');
  const [newObTime, setNewObTime] = useState('');
  const [editingObId, setEditingObId] = useState<string | null>(null);
  const [editObText, setEditObText] = useState('');
  const [editObDate, setEditObDate] = useState('');
  const [editObTime, setEditObTime] = useState('');

  // ── Pixel mode — global roster toggle ────────────────────────────────────────
  const [pixelMode, setPixelMode] = useLocalStorage<boolean>('ef-pixel-mode', false);

  // ── Global Escape key: close any open overlay / panel ───────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Priority: innermost / most specific first
      if (editingObId)    { setEditingObId(null); return; }
      if (showPrivacy)    { setShowPrivacy(false); return; }
      if (showAddStudent) { setShowAddStudent(false); return; }
      if (focusedRosterId) { setFocusedRosterId(null); setRosterHovered(false); return; }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingObId, showPrivacy, showAddStudent, focusedRosterId]);

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
        @keyframes pixelBounce {
          0%, 100% { transform: translateY(0px); }
          40%      { transform: translateY(-4px); }
          60%      { transform: translateY(-2px); }
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
          onBack={() => navigate(() => setView('student'))}
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
          onBack={() => navigate(() => setView('student'))}
        />
      </EditorialShell>{Curtain}</>
    );
  }

  // ── Student login ────────────────────────────────────────────────────────────

  if (view === 'student-login') {
    const privacyModal = showPrivacy ? (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', maxWidth: 480, width: '90%', padding: '48px 40px', position: 'relative' }}>
          <button onClick={() => setShowPrivacy(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={16} /></button>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.35, marginBottom: 20 }}>Data &amp; Privacy</p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 24 }}>How your data is used</h2>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.75, color: '#444' }}>
            <p style={{ marginBottom: 12 }}><strong>What we collect</strong> — Your name, grade, session notes, goals, habits, and EF skill ratings entered by your coach during sessions.</p>
            <p style={{ marginBottom: 12 }}><strong>Google Calendar</strong> — If you connect Google, we add only the events you explicitly approve. We never read or modify your existing calendar data.</p>
            <p style={{ marginBottom: 12 }}><strong>Google Drive / Docs</strong> — If you sync Docs, we can read writing you share to help your coach track progress. You control which files are shared.</p>
            <p style={{ marginBottom: 12 }}><strong>Who can see it</strong> — Only you and your coach. Data lives in this browser session and is never sent to any third party.</p>
            <p><strong>Your rights</strong> — Ask your coach to remove your data any time.</p>
          </div>
          <button onClick={() => { setPrivacyAccepted(true); setShowPrivacy(false); }}
            style={{ marginTop: 32, width: '100%', backgroundColor: '#000', color: '#fff', border: 'none', padding: '12px 0', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
            I understand — continue
          </button>
        </div>
      </div>
    ) : null;

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'var(--font-space-grotesk), sans-serif', cursor: 'none', position: 'relative' }}>
        {/* Custom cursor */}
        <div aria-hidden style={{ position: 'fixed', left: cursor.pos.x, top: cursor.pos.y, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', backgroundColor: '#000', pointerEvents: 'none', zIndex: 9999 }} />

        {privacyModal}
        {Curtain}

        <div style={{ maxWidth: 440, margin: '0 auto', padding: '80px 24px' }}>
          {/* Header */}
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.3, marginBottom: 40 }}>EF Dashboard — Student login</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 48 }}>Who are you?</h1>

          {/* Student list */}
          <div style={{ borderBottom: '1px solid #000' }}>
            {students.map(student => (
              <button key={student.id}
                onClick={() => {
                  if (!privacyAccepted) { setShowPrivacy(true); return; }
                  setStudentMode(true);
                  setSelectedStudentId(student.id);
                  navigate(() => { setView('student'); setStudentTab('looking-ahead'); setTabVisible(true); });
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '20px 0', backgroundColor: 'transparent', border: 'none', borderTop: '1px solid #000', cursor: 'none', textAlign: 'left' }}>
                <span style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.025em' }}>{student.name}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.35 }}>{student.grade}</span>
              </button>
            ))}
          </div>

          {/* Privacy checkbox */}
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <input type="checkbox" id="privacy" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="privacy" style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#000', opacity: 0.55 }}>
              I understand how my data is used.{' '}
              <button onClick={() => setShowPrivacy(true)} style={{ color: '#000', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'none', padding: 0, fontSize: 'inherit' }}>
                Read the privacy notice
              </button>
            </label>
          </div>

          {!privacyAccepted && (
            <p style={{ marginTop: 12, fontSize: '0.7rem', color: '#c00', opacity: 0.7 }}>Please read and accept the privacy notice before logging in.</p>
          )}

          {/* Back to coach view */}
          <button onClick={() => navigate(() => setView('roster'))}
            style={{ marginTop: 48, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', opacity: 0.3, background: 'none', border: 'none', cursor: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={11} /> Coach view
          </button>
        </div>
      </div>
    );
  }

  // ── Roster ───────────────────────────────────────────────────────────────────

  // ── Coach gate — must be signed in with role === 'coach' ────────────────────
  if (view === 'roster' && !isCoach) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'var(--font-space-grotesk), sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'none', position: 'relative' }}>
        <div aria-hidden style={{ position: 'fixed', left: cursor.pos.x, top: cursor.pos.y, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', backgroundColor: '#000', pointerEvents: 'none', zIndex: 9999 }} />
        {Curtain}
        <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.3, marginBottom: 32 }}>EF Dashboard</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 48 }}>Coach access</h1>
          <p style={{ fontSize: '0.875rem', color: '#000', opacity: 0.5, lineHeight: 1.6, marginBottom: 40 }}>
            Sign in with your Google account to access the roster.
          </p>
          {authError && <p style={{ fontSize: '0.75rem', color: '#c00', marginBottom: 16 }}>{authError}</p>}
          <button onClick={handleGoogleSignIn} disabled={signingIn}
            style={{ width: '100%', padding: '14px 0', backgroundColor: '#000', color: '#fff', border: 'none', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'none', opacity: signingIn ? 0.5 : 1 }}>
            {signingIn ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => navigate(() => setView('student-login'))}
              style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', opacity: 0.3, background: 'none', border: 'none', cursor: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
              Student login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'roster') {
    function openStudentDirect(id: string) {
      setSelectedStudentId(id); setView('student'); setStudentTab('looking-ahead');
      setTabVisible(true); setFocusedRosterId(null); setRosterHovered(false);
      setOverlayExiting(false);
    }
    function openStudent(id: string)   { navigate(() => { setSelectedStudentId(id); setView('student');     setStudentTab('looking-ahead'); setTabVisible(true); setFocusedRosterId(null); setRosterHovered(false); }); }
    function goAssessment(id: string)  { navigate(() => { setSelectedStudentId(id); setView('assessment');   setFocusedRosterId(null); setRosterHovered(false); }); }
    function goPersonality(id: string) { navigate(() => { setSelectedStudentId(id); setView('personality');  setFocusedRosterId(null); setRosterHovered(false); }); }

    const focusedStudent = students.find(s => s.id === focusedRosterId) ?? null;

    // Four radial options
    const customLabel = studentThemes[focusedStudent?.id ?? '']?.customRadialLabel ?? 'Custom';
    const RADIAL: { label: string; icon: React.ReactNode; angle: number; action: () => void; secondary?: boolean }[] = focusedStudent ? [
      { label: 'Dashboard', icon: <ChevronRight size={14} />, angle: -90, action: () => {
        setOverlayExiting(true);
        setTimeout(() => openStudentDirect(focusedStudent.id), 280);
      }},
      { label: 'Growth',    icon: <TrendingUp size={14} />,   angle: 180, action: () => navigate(() => { setSelectedStudentId(focusedStudent.id); setView('student'); setStudentTab('growth'); setTabVisible(true); setFocusedRosterId(null); setRosterHovered(false); }), secondary: true },
      { label: 'Drills',    icon: <Play size={14} />,         angle:   0, action: () => navigate(() => { setSelectedStudentId(focusedStudent.id); setView('student'); setStudentTab('drills'); setTabVisible(true); setFocusedRosterId(null); setRosterHovered(false); }), secondary: true },
      { label: customLabel, icon: <Star size={14} />,         angle:  90, action: () => goPersonality(focusedStudent.id), secondary: true },
    ] : [];

    return (
      <><EditorialShell theme={designTheme} className="min-h-screen" style={{ position: 'relative', cursor: 'none' }}>

        {/* ── Margin bugs ── */}
        {pixelMode && <MarginBugs names={students.map(s => s.name)} color={designTheme.main.heading} />}

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
            style={{
              backgroundColor: designTheme.main.bg, zIndex: 900, cursor: 'none',
              opacity: overlayExiting ? 0 : 1,
              transition: overlayExiting ? 'opacity 280ms ease' : 'none',
            }}
            onMouseMove={keepRadialAlive}
            onClick={() => { setFocusedRosterId(null); setRosterHovered(false); }}>

            {/* Centered name + radial */}
            <div
              className="relative flex items-center justify-center select-none"
              style={{ padding: '80px' }}
              onClick={e => e.stopPropagation()}>

              {/* The name + horizontal nav row */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}
                onMouseEnter={showRadial}>
                <div className="text-center">
                  {/* Pixel critter — shown above name in pixel mode */}
                  {pixelMode && focusedStudent && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                      <PixelAvatar name={focusedStudent.name} size={64} color={designTheme.main.heading} bounce />
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: designTheme.main.body, opacity: 0.4, marginTop: 6 }}>
                        {CRITTER_NAMES[getCritterIndex(focusedStudent.name)]}
                      </span>
                    </div>
                  )}
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
                  {/* Pulsing hint — fades out when nav row appears */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    marginTop: 16,
                    opacity: rosterHovered ? 0 : 1,
                    transition: 'opacity 300ms ease',
                  }}>
                    <ChevronDown
                      size={16}
                      style={{
                        color: '#000', opacity: 0.4,
                        animation: 'gdPulse 2s ease-in-out infinite',
                        transform: 'rotate(180deg)',
                      }}
                    />
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                      textTransform: 'uppercase', color: '#000', opacity: 0.3,
                    }}>hover name to navigate</span>
                  </div>
                  <style>{`
                    @keyframes gdPulse {
                      0%, 100% { opacity: 0.2; }
                      50%       { opacity: 0.6; }
                    }
                  `}</style>
                </div>

                {/* Horizontal navigation buttons row */}
                <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                  {RADIAL.map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: rosterHovered ? 1 : 0,
                        transform: rosterHovered ? 'translateY(0)' : 'translateY(8px)',
                        transition: `opacity 400ms ease ${i * 60}ms, transform 400ms ease ${i * 60}ms`,
                        pointerEvents: rosterHovered ? 'auto' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'none',
                        padding: 0,
                      }}>
                      <div
                        style={{
                          width: 36, height: 36,
                          border: '1px solid #000',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: 'transparent',
                          color: '#000',
                          transition: 'background-color 120ms, color 120ms',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#000'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#000'; }}>
                        {item.icon}
                      </div>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: '#000', opacity: 0.6,
                        whiteSpace: 'nowrap',
                      }}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Back hint + Student login */}
            <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px' }}>
              <p style={{
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: designTheme.main.body, opacity: 0.3, margin: 0,
              }}>
                Click anywhere to go back
              </p>
              <button
                onClick={e => { e.stopPropagation(); setFocusedRosterId(null); setRosterHovered(false); navigate(() => setView('student-login')); }}
                style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: designTheme.main.body, opacity: 0.3, background: 'none', border: 'none', cursor: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
                Student login →
              </button>
            </div>
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
            {/* Theme switcher + pixel toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#000', opacity: 0.35, margin: 0 }}>
                  Coach view
                </p>
                <button onClick={handleSignOut}
                  style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', opacity: 0.3, background: 'none', border: 'none', cursor: 'none', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
                  Sign out
                </button>
              </div>
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
              {/* Pixel mode toggle */}
              <button
                onClick={() => setPixelMode(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'none', border: 'none', cursor: 'none', padding: 0, marginTop: 2,
                }}>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: '#000',
                  opacity: pixelMode ? 0.8 : 0.35,
                  transition: 'opacity 200ms ease',
                }}>
                  Pixel
                </span>
                {/* Square toggle pill */}
                <div style={{
                  width: 30, height: 16, borderRadius: 2,
                  backgroundColor: pixelMode ? '#000' : 'transparent',
                  border: '1.5px solid rgba(0,0,0,0.25)',
                  position: 'relative',
                  transition: 'background-color 200ms ease',
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2,
                    left: pixelMode ? 14 : 2,
                    width: 8, height: 8,
                    backgroundColor: pixelMode ? '#fff' : 'rgba(0,0,0,0.3)',
                    borderRadius: 1,
                    transition: 'left 150ms ease, background-color 150ms ease',
                  }} />
                </div>
                {pixelMode && <PixelAvatar name={students[0]?.name ?? 'A'} size={16} color="#000" bounce />}
              </button>
            </div>
          </div>

          {/* Name list — full-width typographic rows */}
          <div style={{ borderBottom: '1px solid #000' }}>
            {students.map(student => {
              const stuSessions = sessions.filter(s => s.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));
              const last = stuSessions[stuSessions.length - 1] ?? null;
              let trend: 'up' | 'flat' | 'down' | null = null;
              if (stuSessions.length >= 2) {
                const prev = stuSessions[stuSessions.length - 2];
                const avgLast = Object.values(last.efRatings).reduce((a, b) => a + b, 0) / 3;
                const avgPrev = Object.values(prev.efRatings).reduce((a, b) => a + b, 0) / 3;
                trend = avgLast > avgPrev + 0.3 ? 'up' : avgLast < avgPrev - 0.3 ? 'down' : 'flat';
              }
              return (
                <RosterTile
                  key={student.id}
                  student={student}
                  lastSession={last}
                  trend={trend}
                  onClick={() => { setFocusedRosterId(student.id); setRosterHovered(false); }}
                />
              );
            })}

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

          {/* Student login link */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 60 }}>
            <button onClick={() => { setFocusedRosterId(null); setRosterHovered(false); navigate(() => setView('student-login')); }}
              style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', opacity: 0.3, background: 'none', border: 'none', cursor: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
              Student login →
            </button>
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

    function startEditOb(ob: Obligation) {
      setEditingObId(ob.id);
      setEditObText(ob.text);
      setEditObDate(ob.plannedDate);
      setEditObTime(ob.plannedTime);
    }

    function saveObEdit() {
      if (!editObText.trim()) return;
      setObligations(prev => prev.map(o => o.id === editingObId
        ? { ...o, text: editObText.trim(), plannedDate: editObDate, plannedTime: editObTime }
        : o
      ));
      setEditingObId(null);
    }

    function deleteOb(id: string) {
      setObligations(prev => prev.filter(o => o.id !== id));
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

    // Privacy modal (reusable within student view)
    const PrivacyOverlay = showPrivacy ? (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', maxWidth: 480, width: '90%', padding: '48px 40px', position: 'relative' }}>
          <button onClick={() => setShowPrivacy(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={16} /></button>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.35, marginBottom: 20 }}>Data &amp; Privacy</p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 24 }}>How your data is used</h2>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.75, color: '#444' }}>
            <p style={{ marginBottom: 12 }}><strong>What we collect</strong> — Your name, grade, session notes, goals, habits, and EF skill ratings entered by your coach.</p>
            <p style={{ marginBottom: 12 }}><strong>Google Calendar</strong> — We add only events you explicitly approve. We never read your existing calendar data.</p>
            <p style={{ marginBottom: 12 }}><strong>Google Drive</strong> — We can read writing you choose to share. You control which files are shared.</p>
            <p style={{ marginBottom: 12 }}><strong>Who sees it</strong> — Only you and your coach. Nothing is sent to external servers.</p>
            <p><strong>Your rights</strong> — Ask your coach to remove your data any time.</p>
          </div>
          <button onClick={() => setShowPrivacy(false)}
            style={{ marginTop: 32, width: '100%', backgroundColor: '#000', color: '#fff', border: 'none', padding: '12px 0', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Got it
          </button>
        </div>
      </div>
    ) : null;

    // ── Log session modal ───────────────────────────────────────────────────────
    const LogSessionModal = showLogSession ? (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: 440, padding: '36px 32px', position: 'relative' }}>
          <button onClick={() => setShowLogSession(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={16} /></button>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.35, marginBottom: 6 }}>Advisory</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: 28 }}>Log a session — {student.name.split(' ')[0]}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 8 }}>Date</p>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #000', padding: '6px 0', fontSize: '0.95rem', background: 'transparent', outline: 'none', color: '#000' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 12 }}>EF Ratings</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {EF_AREAS.map(area => (
                  <div key={area.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#000', opacity: 0.6, width: 110, flexShrink: 0 }}>{area.label}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5].map(v => (
                        <button key={v} onClick={() => setLogRatings(r => ({ ...r, [area.key]: v }))}
                          style={{ width: 32, height: 32, border: '1.5px solid', borderColor: logRatings[area.key] === v ? area.color : '#ddd', backgroundColor: logRatings[area.key] === v ? area.color : 'transparent', color: logRatings[area.key] === v ? '#fff' : '#000', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 120ms ease' }}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: area.color, fontWeight: 600, minWidth: 80 }}>{EF_LEVEL_LABELS[logRatings[area.key]]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 8 }}>Motivation & effort</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['😩','😕','😐','😊','🔥'] as const).map((emoji, i) => (
                  <button key={i} onClick={() => setLogMotivation(i + 1)}
                    style={{ flex: 1, padding: '8px 0', fontSize: '1.1rem', border: '1.5px solid', borderColor: logMotivation === i + 1 ? '#000' : '#ddd', backgroundColor: logMotivation === i + 1 ? '#000' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 120ms ease' }}>
                    <span>{emoji}</span>
                    <span style={{ fontSize: '0.45rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: logMotivation === i + 1 ? '#fff' : 'rgba(0,0,0,0.4)' }}>{['Low','Rough','Okay','Good','High'][i]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 8 }}>Session notes</p>
              <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)}
                rows={3} placeholder="What did you work on? What did you notice?"
                style={{ width: '100%', border: '1px solid #e5e5e5', padding: '10px 12px', fontSize: '0.85rem', resize: 'none', outline: 'none', backgroundColor: 'transparent', fontFamily: 'inherit', color: '#000' }} />
            </div>
            <button onClick={() => saveLogSession(student.id)}
              style={{ width: '100%', padding: '12px 0', backgroundColor: '#000', color: '#fff', border: 'none', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Save session
            </button>
          </div>
        </div>
      </div>
    ) : null;

    return (
      <><EditorialShell theme={designTheme} className="h-screen flex flex-col overflow-hidden" style={{ background: designTheme.main.bg }}>
        {PrivacyOverlay}
        {LogSessionModal}

        {/* ── Margin bugs ── */}
        {pixelMode && <MarginBugs names={students.map(st => st.name)} color={s.primary} opacity={0.22} />}

        {/* ── Top header ── */}
        <header style={{ backgroundColor: '#000', borderBottom: '1px solid #222', flexShrink: 0 }}>
          <div className="flex items-center gap-4 px-6 py-4">
            {studentMode ? (
              <button onClick={() => handleSignOut()}
                className="flex items-center gap-1.5 text-xs flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <ArrowLeft size={13} /> Sign out
              </button>
            ) : (
              <button onClick={() => navigate(() => { setView('roster'); setFocusedRosterId(null); setRosterHovered(false); })}
                className="flex items-center gap-1.5 text-xs flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <ArrowLeft size={13} /> All students
              </button>
            )}

            {/* Avatar */}
            <div className="w-10 h-10 flex items-center justify-center text-base font-black flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }}>
              {s.preset === 'pixel'
                ? <PixelAvatar name={student.name} size={36} color="#fff" />
                : student.name[0]}
            </div>

            {/* Name + grade */}
            <div className="min-w-0">
              <h1 className="font-black text-lg leading-none" style={{ color: '#fff' }}>{student.name}</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {s.preset === 'pixel'
                  ? `${CRITTER_NAMES[getCritterIndex(student.name)]} · ${student.grade ? `${student.grade} · ` : ''}${studentSessions.length} sessions`
                  : `${student.grade ? `${student.grade} · ` : ''}${studentSessions.length} sessions · ${studentHabits.length} habits`}
              </p>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!studentMode && (
                <>
                  <button onClick={openLogSession}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition-opacity hover:opacity-70"
                    style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <Plus size={12} /> Log session
                  </button>
                  <button onClick={() => navigate(() => setView('personality'))}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition-opacity hover:opacity-70"
                    style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    <Smile size={12} /> Personalise
                  </button>
                </>
              )}
              {/* Student switcher — teacher only */}
              {!studentMode && students.filter(s => s.id !== student.id).slice(0, 4).map(s => {
                const sTheme = studentThemes[s.id];
                const isPixel = sTheme?.preset === 'pixel';
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(() => { setSelectedStudentId(s.id); setView('student'); setStudentTab('looking-ahead'); setTabVisible(true); })}
                    className="w-7 h-7 flex items-center justify-center font-bold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}>
                    {isPixel
                      ? <PixelAvatar name={s.name} size={20} color="#fff" bounce={false} />
                      : s.name[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex px-6" style={{ borderTop: '1px solid #222' }}>
            {([
              ['looking-back',  'Looking Back'],
              ['looking-ahead', 'Looking Ahead'],
              ['growth',        'Growth'],
              ['drills',        'My Toolkit'],
              ['space',         'Space'],
            ] as [StudentTab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => switchStudentTab(key)}
                className="px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
                style={studentTab === key
                  ? { borderColor: '#fff', color: '#fff' }
                  : { borderColor: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: designTheme.main.bg }}>
          <div style={{ opacity: tabVisible ? 1 : 0, transition: 'opacity 150ms ease' }}>

            {studentTab === 'looking-back' && (
              <div className="space-y-4">
                {/* Student self-rating — student mode only */}
                {studentMode && (() => {
                  const latestSelf = [...studentSessions].reverse().find(s => s.selfRating);
                  const [selfRating, setSelfRating] = React.useState<number>(latestSelf?.selfRating ?? 0);
                  const [selfNote, setSelfNote] = React.useState<string>(latestSelf?.selfNote ?? '');
                  const SELF_EMOJIS = ['😩','😕','😐','😊','🔥'];
                  const SELF_LABELS = ['Really hard','Tough week','Okay','Good week','Crushed it'];
                  function saveSelfRating(rating: number) {
                    setSelfRating(rating);
                    const latest = [...studentSessions].reverse()[0];
                    if (!latest) return;
                    setSessions(prev => prev.map(s => s.id === latest.id ? { ...s, selfRating: rating, selfNote } : s));
                  }
                  function saveSelfNote() {
                    const latest = [...studentSessions].reverse()[0];
                    if (!latest || !selfNote.trim()) return;
                    setSessions(prev => prev.map(s => s.id === latest.id ? { ...s, selfRating: selfRating || undefined, selfNote } : s));
                  }
                  return (
                    <div style={{ ...cardStyle, borderLeft: `3px solid ${accent}` }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>Your take</p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: designTheme.main.body, marginBottom: 16 }}>How do YOU think this week went?</p>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {SELF_EMOJIS.map((emoji, i) => (
                          <button key={i} onClick={() => saveSelfRating(i + 1)}
                            title={SELF_LABELS[i]}
                            style={{ flex: 1, padding: '10px 0', fontSize: '1.3rem', border: '1.5px solid', borderColor: selfRating === i + 1 ? accent : designTheme.main.cardBorder, backgroundColor: selfRating === i + 1 ? `${accent}15` : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 150ms ease' }}>
                            <span>{emoji}</span>
                            <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: selfRating === i + 1 ? accent : designTheme.main.body, opacity: selfRating === i + 1 ? 1 : 0.4 }}>{SELF_LABELS[i]}</span>
                          </button>
                        ))}
                      </div>
                      <textarea value={selfNote} onChange={e => setSelfNote(e.target.value)} onBlur={saveSelfNote}
                        rows={2} placeholder="What felt hard this week? What helped you push through?"
                        style={{ width: '100%', border: 'none', borderBottom: `1px solid ${designTheme.main.cardBorder}`, padding: '6px 0', fontSize: '0.8rem', resize: 'none', outline: 'none', backgroundColor: 'transparent', fontFamily: 'inherit', color: designTheme.main.body }} />
                    </div>
                  );
                })()}

                {/* EF Skill bars */}
                {latestSession ? (
                  <div style={{ ...cardStyle, marginBottom: 0, borderBottom: '1px solid #000', paddingBottom: 24 }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#000', opacity: 0.4, marginBottom: 16 }}>EF Skills</p>
                    <div style={{ display: 'flex', gap: 32 }}>
                      {EF_AREAS.map(area => (
                        <div key={area.key} style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#000', opacity: 0.5 }}>{area.label.split(' ')[0]}</span>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#000' }}>{latestSession.efRatings[area.key]}/5</span>
                          </div>
                          <div style={{ height: 2, backgroundColor: '#eee', width: '100%' }}>
                            <div style={{ height: '100%', backgroundColor: '#000', width: `${(latestSession.efRatings[area.key] / 5) * 100}%`, transition: 'width 600ms ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                    <p className="text-sm text-stone-500 mb-3">No sessions yet — run an assessment to get started</p>
                    <button
                      onClick={() => navigate(() => setView('assessment'))}
                      className="px-4 py-2 text-xs font-bold text-white"
                      style={{ backgroundColor: '#000' }}>
                      Run assessment
                    </button>
                  </div>
                )}

                {/* Last week review */}
                <div style={cardStyle}>
                  <SectionLabel title="Last week's goals & habits" sub={weekLabel(lastWeek)} />
                  {prevTotal === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-4">Nothing was set for last week yet.</p>
                  ) : (
                    <>
                      {prevCompleted === prevTotal && prevTotal > 0 ? (
                        <div className="px-3 py-3 mb-3 text-center" style={{ backgroundColor: `${accent}15`, border: `2px solid ${accent}40` }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>🎉</div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: accent }}>You crushed it — everything done!</p>
                          <p style={{ fontSize: '0.65rem', color: designTheme.main.body, opacity: 0.6, marginTop: 2 }}>{prevTotal} of {prevTotal} goals &amp; habits completed</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2 mb-3 text-sm" style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}20` }}>
                          <span className="font-semibold text-stone-700">{prevCompleted}/{prevTotal} completed</span>
                          <span className="text-xs font-medium" style={{ color: designTheme.main.body }}>{prevCompleted > prevTotal / 2 ? 'Strong week' : 'Keep building'}</span>
                        </div>
                      )}
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

              </div>
            )}

            {studentTab === 'looking-ahead' && (
              <div className="space-y-4">
                {/* This week ahead */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <SectionLabel title="Week ahead" sub={weekLabel(thisWeek)} />
                    {/* Google Calendar: add-all or connect */}
                    <div style={{ flexShrink: 0, marginLeft: 12 }}>
                      {authError && <p style={{ fontSize: '0.65rem', color: '#c00', marginBottom: 6 }}>{authError}</p>}
                      {gcalSuccess ? (
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a' }}>✓ Added to Calendar</span>
                      ) : googleToken ? (
                        <button
                          onClick={() => addAllToGoogleCalendar(thisWeekObs)}
                          disabled={gcalAdding || thisWeekObs.filter(o => o.plannedDate && !o.completed).length === 0}
                          style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: '#000', color: '#fff', border: 'none', padding: '6px 12px', cursor: gcalAdding ? 'wait' : 'pointer', opacity: gcalAdding ? 0.5 : 1 }}>
                          {gcalAdding ? 'Adding…' : `Add all to Google Cal`}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGoogleSignIn()}
                          style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: 'transparent', color: '#000', border: '1px solid #000', padding: '6px 12px', cursor: 'pointer', opacity: 0.6 }}>
                          Connect Google Calendar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Existing items */}
                  {thisWeekObs.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {thisWeekObs.map(ob => (
                        <div key={ob.id}>
                          {editingObId === ob.id ? (
                            /* ── Inline edit form ── */
                            <div style={{ border: '1px solid #000', padding: 10 }}>
                              <input
                                className="w-full outline-none text-sm mb-2"
                                style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, backgroundColor: 'transparent', color: designTheme.main.body }}
                                value={editObText} onChange={e => setEditObText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveObEdit()} autoFocus />
                              <input type="datetime-local" className="text-xs outline-none mb-2 block"
                                style={{ color: designTheme.main.body, backgroundColor: 'transparent' }}
                                value={editObDate && editObTime ? `${editObDate}T${editObTime}` : editObDate ? `${editObDate}T00:00` : ''}
                                onChange={e => {
                                  const [d, t] = e.target.value.split('T');
                                  setEditObDate(d ?? ''); setEditObTime(t ?? '');
                                }} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={saveObEdit} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: '#000', color: '#fff', border: 'none', padding: '5px 12px', cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setEditingObId(null)} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: 'transparent', color: '#000', border: '1px solid #ccc', padding: '5px 12px', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={() => deleteOb(ob.id)} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: 'transparent', color: '#c00', border: 'none', padding: '5px 0', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            /* ── Display row ── */
                            <div className="flex items-start gap-2 group">
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
                              <button onClick={() => startEditOb(ob)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity flex-shrink-0 mt-0.5" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <Pencil size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add item form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="border px-2.5 py-1.5 text-xs outline-none"
                      style={{ borderColor: designTheme.main.cardBorder, backgroundColor: designTheme.main.card, color: designTheme.main.body }}
                      placeholder="Add assignment or task…"
                      value={newObText} onChange={e => setNewObText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addObligation()} />
                    <input type="datetime-local" className="border px-2 py-1.5 text-xs outline-none"
                      style={{ borderColor: designTheme.main.cardBorder, backgroundColor: designTheme.main.card, color: designTheme.main.body }}
                      value={newObDate && newObTime ? `${newObDate}T${newObTime}` : newObDate ? `${newObDate}T00:00` : ''}
                      onChange={e => {
                        const [d, t] = e.target.value.split('T');
                        setNewObDate(d ?? ''); setNewObTime(t ?? '');
                      }} />
                  </div>
                  <button
                    onClick={addObligation}
                    className="w-full py-2 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: newObText.trim() ? designTheme.main.btn : '#e5e5e5',
                      color: newObText.trim() ? designTheme.main.btnText : '#999',
                      border: 'none',
                    }}>
                    Add to week
                  </button>
                </div>
              </div>
            )}

            {studentTab === 'growth' && (() => {
              const chartData = studentSessions.map(s => ({
                date: fmtDate(s.date),
                'Getting Started': s.efRatings.taskInitiation,
                'Focus & Memory': s.efRatings.workingMemory,
                'Managing Time': s.efRatings.timeManagement,
              }));
              const [fg] = getAvatarColors(student.name);
              const strengths = latestSession
                ? EF_AREAS.map(area => ({ area, value: latestSession.efRatings[area.key] })).sort((a, b) => b.value - a.value)
                : [];
              const improvements = studentSessions.length >= 2
                ? EF_AREAS.map(area => ({ area, delta: latestSession.efRatings[area.key] - studentSessions[0].efRatings[area.key] })).filter(x => x.delta > 0)
                : [];
              return !latestSession ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                  <p className="text-sm text-stone-400">Nothing to chart yet — add sessions to track growth</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {improvements.length > 0 && (
                    <div className="rounded-2xl p-4" style={{ backgroundColor: `${fg}10`, border: `1.5px solid ${fg}20` }}>
                      <p className="font-semibold text-stone-800 text-sm">Top improvement: <span style={{ color: fg }}>{improvements[0].area.label}</span></p>
                      <p className="text-xs text-stone-500 mt-0.5">Up {improvements[0].delta} {improvements[0].delta === 1 ? 'level' : 'levels'} since first session</p>
                    </div>
                  )}
                  <div className="space-y-3">
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
                    <Card className="p-5">
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
              );
            })()}

            {studentTab === 'drills' && (
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
                      studentName={student.name}
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

                {/* Google Suite sync */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 8 }}>Google Suite</p>
                    <p style={{ fontSize: '0.8rem', color: designTheme.main.body, opacity: 0.65, lineHeight: 1.6 }}>
                      Connect your Google account to sync your week plan with Google Calendar and share Docs with your coach.
                    </p>
                  </div>

                  {/* Google Calendar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${designTheme.main.cardBorder}` }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: designTheme.main.body }}>Google Calendar</p>
                      <p style={{ fontSize: '0.7rem', color: designTheme.main.body, opacity: 0.5 }}>
                        {googleToken ? 'Connected — week items sync automatically' : 'Add your week plan directly to your calendar'}
                      </p>
                    </div>
                    {googleToken ? (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a' }}>✓ Connected</span>
                    ) : (
                      <button onClick={() => handleGoogleSignIn()}
                        style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: '#000', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
                        Connect
                      </button>
                    )}
                  </div>

                  {/* Google Drive / Docs */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${designTheme.main.cardBorder}` }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: designTheme.main.body }}>Google Docs</p>
                      <p style={{ fontSize: '0.7rem', color: designTheme.main.body, opacity: 0.5 }}>Share writing with your coach for feedback and progress tracking</p>
                    </div>
                    <button
                      onClick={() => handleGoogleSignIn()}
                      style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: 'transparent', color: '#000', border: '1px solid #000', padding: '8px 16px', cursor: 'pointer', opacity: 0.6 }}>
                      Connect
                    </button>
                  </div>

                  <p style={{ fontSize: '0.65rem', color: designTheme.main.body, opacity: 0.35, lineHeight: 1.5 }}>
                    Google access is managed through your browser session only. Nothing is stored on external servers.{' '}
                    <button onClick={() => setShowPrivacy(true)} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Privacy notice</button>
                  </p>
                </div>
              </div>
            )}

          </div>
        </main>
      </EditorialShell>{Curtain}</>
    );
  }

  return null;
}
