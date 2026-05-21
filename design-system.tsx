'use client';
/**
 * Elemyle Design System
 * ─────────────────────
 * Drop this file into any Next.js + Tailwind project.
 *
 * What's included:
 *   - DESIGN_THEMES           — 5 colour themes (sidebar + main palette)
 *   - EditorialShell          — root wrapper that applies editorial CSS overrides
 *   - editorialStyles()       — returns the raw CSS string (use in dangerouslySetInnerHTML if needed)
 *   - SectionCard             — borderless white card with hairline border
 *   - LabelText               — all-caps micro label
 *   - TextInput               — clean single-line text input
 *   - ProgressBar             — thin horizontal fill bar (0-100)
 *   - StatCard                — big-number stat tile
 *   - Toast / useToast        — auto-dismissing notification
 *
 * Usage:
 *   1. Wrap your app (or layout) in <EditorialShell theme={activeTheme}>…</EditorialShell>
 *   2. Import components as needed.
 *   3. Pass a theme from DESIGN_THEMES (or null for default black/off-white).
 */

import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Colour themes
// ─────────────────────────────────────────────────────────────────────────────

export const DESIGN_THEMES = [
  {
    id: 'editorial-black',
    name: 'Editorial Black',
    tagline: 'Default — pure black on white, gallery-grade editorial',
    sidebar: {
      bg: '#000000',
      text: '#ffffff',
      accent: '#ffffff',
      border: '#1a1a1a',
    },
    main: {
      bg: '#ffffff',
      card: '#ffffff',
      cardBorder: '#000000',
      heading: '#000000',
      body: '#000000',
      accent: '#000000',
      btn: '#000000',
      btnText: '#ffffff',
    },
  },
  {
    id: 'clinical-warmth',
    name: 'Clinical Warmth',
    tagline: 'Modern & trustworthy — like a well-designed health app',
    sidebar: {
      bg: '#0f766e',
      text: '#ffffff',
      accent: '#fbbf24',
      border: '#0d9488',
    },
    main: {
      bg: '#f0fdfa',
      card: '#ffffff',
      cardBorder: '#99f6e4',
      heading: '#134e4a',
      body: '#374151',
      accent: '#0d9488',
      btn: '#0f766e',
      btnText: '#fff',
    },
  },
  {
    id: 'editorial-notebook',
    name: 'Editorial Notebook',
    tagline: 'Literary & warm — like a beautifully designed journal',
    sidebar: {
      bg: '#0f172a',
      text: '#f8f5ef',
      accent: '#f59e0b',
      border: '#1e293b',
    },
    main: {
      bg: '#faf7f0',
      card: '#ffffff',
      cardBorder: '#e7e0d0',
      heading: '#0f172a',
      body: '#44403c',
      accent: '#e85d4a',
      btn: '#0f172a',
      btnText: '#f8f5ef',
    },
  },
  {
    id: 'soft-dashboard',
    name: 'Soft Dashboard',
    tagline: 'Grown-up & spacious — Notion meets a classroom',
    sidebar: {
      bg: '#f5f3ff',
      text: '#3730a3',
      accent: '#4f46e5',
      border: '#ddd6fe',
    },
    main: {
      bg: '#f5f4f2',
      card: '#ffffff',
      cardBorder: '#e5e7eb',
      heading: '#312e81',
      body: '#4b5563',
      accent: '#4f46e5',
      btn: '#4f46e5',
      btnText: '#fff',
    },
  },
  {
    id: 'warm-beige',
    name: 'Warm Beige',
    tagline: 'Calm & grounded — like parchment and pencil marks',
    sidebar: {
      bg: '#3d2f22',
      text: '#f5ede0',
      accent: '#c4a882',
      border: '#4d3d2c',
    },
    main: {
      bg: '#f5efe6',
      card: '#fdf8f2',
      cardBorder: '#e2d0bb',
      heading: '#3d2f22',
      body: '#6b5647',
      accent: '#a8896b',
      btn: '#a8896b',
      btnText: '#fff',
    },
  },
] as const;

export type DesignTheme = typeof DESIGN_THEMES[number];

// ─────────────────────────────────────────────────────────────────────────────
// Editorial CSS override string
// ─────────────────────────────────────────────────────────────────────────────
// Strips rounded corners and shadows from Tailwind utility classes, and
// remaps blue/sky colour utilities to neutral tones so legacy code adapts
// to the editorial palette without touching every className.

export function editorialStyles(theme?: DesignTheme | null): string {
  return `
    /* ── Shape resets ── */
    .gd-editorial .rounded-3xl { border-radius: 0 !important; }
    .gd-editorial .rounded-2xl { border-radius: 0 !important; }
    .gd-editorial .rounded-xl  { border-radius: 2px !important; }
    .gd-editorial .rounded-lg  { border-radius: 2px !important; }
    .gd-editorial .shadow-sm,
    .gd-editorial .shadow,
    .gd-editorial .shadow-lg,
    .gd-editorial .shadow-2xl  { box-shadow: none !important; }

    /* ── Colour remaps (blue → neutral) ── */
    .gd-editorial .text-blue-900 { color: #0f0f0f !important; }
    .gd-editorial .text-blue-800 { color: #1a1a1a !important; }
    .gd-editorial .text-blue-700 { color: #2d2d2d !important; }
    .gd-editorial .text-blue-600 { color: #525252 !important; }
    .gd-editorial .text-blue-500 { color: #737373 !important; }
    .gd-editorial .text-blue-400 { color: #a3a3a3 !important; }
    .gd-editorial .text-blue-300 { color: #c4c4c4 !important; }
    .gd-editorial .bg-sky-50     { background-color: #fafaf8 !important; }
    .gd-editorial .bg-sky-100    { background-color: #f0f0ec !important; }
    .gd-editorial .bg-blue-800   { background-color: #0f0f0f !important; }
    .gd-editorial .bg-blue-700   { background-color: #1a1a1a !important; }
    .gd-editorial .border-sky-200 { border-color: #e0e0dc !important; }
    .gd-editorial .border-sky-100 { border-color: #ebebeb !important; }
    .gd-editorial .border-sky-300 { border-color: #d0d0cc !important; }
    .gd-editorial .hover\\:bg-sky-50:hover  { background-color: #f0f0ec !important; }
    .gd-editorial .hover\\:bg-sky-100:hover { background-color: #e8e8e4 !important; }
    .gd-editorial .text-stone-800 { color: #0f0f0f !important; }
    .gd-editorial .text-stone-500 { color: #737373 !important; }
    .gd-editorial .text-stone-400 { color: #a3a3a3 !important; }

    /* ── Keyframes ── */
    @keyframes gd-fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes gd-toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    ${theme ? `
    /* ── Active theme overrides ── */
    .gd-themed .text-blue-900 { color: ${theme.main.heading} !important; }
    .gd-themed .text-blue-800 { color: ${theme.main.heading} !important; }
    .gd-themed .text-blue-700 { color: ${theme.main.body} !important; }
    .gd-themed .text-blue-600 { color: ${theme.main.body} !important; }
    .gd-themed .text-blue-500 { color: ${theme.main.body} !important; opacity: 0.75; }
    .gd-themed .text-blue-400 { color: ${theme.main.body} !important; opacity: 0.55; }
    .gd-themed .bg-white      { background-color: ${theme.main.card} !important; }
    .gd-themed .bg-sky-50     { background-color: ${theme.main.card} !important; }
    .gd-themed .bg-sky-100    { background-color: ${theme.main.cardBorder} !important; }
    .gd-themed .border-sky-200 { border-color: ${theme.main.cardBorder} !important; }
    .gd-themed .border-sky-100 { border-color: ${theme.main.cardBorder} !important; }
    .gd-themed .border-sky-300 { border-color: ${theme.main.cardBorder} !important; }
    .gd-themed .text-stone-500 { color: ${theme.main.body} !important; opacity: 0.7; }
    .gd-themed .text-stone-400 { color: ${theme.main.body} !important; opacity: 0.5; }
    .gd-themed .text-stone-800 { color: ${theme.main.heading} !important; }
    ` : ''}
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// EditorialShell
// ─────────────────────────────────────────────────────────────────────────────
// Root wrapper. Apply to your top-level layout or page component.
//
// <EditorialShell theme={activeTheme}>
//   <YourApp />
// </EditorialShell>

export function EditorialShell({
  children,
  theme,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  theme?: DesignTheme | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`gd-editorial${theme ? ' gd-themed' : ''} ${className}`}
      style={{
        background: theme?.main.bg ?? '#f5f5f0',
        color: theme?.main.heading ?? '#0f0f0f',
        ...(theme ? {
          '--gd-heading'  : theme.main.heading,
          '--gd-body'     : theme.main.body,
          '--gd-card'     : theme.main.card,
          '--gd-border'   : theme.main.cardBorder,
          '--gd-accent'   : theme.main.accent,
          '--gd-sidebar'  : theme.sidebar.bg,
          '--gd-sidebar-text': theme.sidebar.text,
        } : {}),
        ...style,
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: editorialStyles(theme) }} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI components
// ─────────────────────────────────────────────────────────────────────────────

/** Flat white card with a single hairline border. */
export function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-neutral-200 ${className}`}>
      {children}
    </div>
  );
}

/** All-caps micro label — use above form fields and section headers. */
export function LabelText({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </label>
  );
}

/** Clean single-line text input. */
export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 transition-colors"
    />
  );
}

/** Thin horizontal progress bar. Pass value 0–100. */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-0.5 w-full bg-neutral-100 overflow-hidden">
      <div
        className="h-full bg-neutral-900 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Large editorial stat tile.
 *
 * <StatCard label="Samples" value="12" sub="since March" />
 */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-neutral-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</div>
      <div className="font-black text-3xl leading-none mt-2 text-neutral-900">{value}</div>
      {sub && <div className="text-xs text-neutral-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

export function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: ToastType;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg: Record<ToastType, string> = {
    success: '#15803d',
    error:   '#dc2626',
    info:    '#1d4ed8',
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[9999] flex items-center gap-3 px-5 py-3 text-white text-sm font-medium pointer-events-none"
      style={{
        transform: 'translateX(-50%)',
        background: bg[type],
        animation: 'gd-toastIn 0.25s ease-out',
      }}
    >
      {type === 'success' && <Check className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

/** Drop-in hook for managing toast state. */
export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null);
  const show = React.useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);
  const hide = React.useCallback(() => setToast(null), []);
  return { toast, show, hide };
}
