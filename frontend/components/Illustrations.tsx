"use client";

import React from "react";

/**
 * Hand-authored flat illustrations in a friendly "playful scholar" style:
 * bold outlines (via currentColor so they adapt to light/dark) + pastel fills.
 * Set the outline color by adding a text color class, e.g.
 *   <HeroStudy className="text-slate-900 dark:text-slate-100" />
 */

type SVGProps = { className?: string };

/** Small squiggle accent — place under/after a heading word. */
export function Squiggle({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 80 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 10C12 2 20 14 30 8s18-10 27-3 17 7 17 2"
        stroke="#f97316"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Signature hero: a student with a graduation cap, lightbulb idea, books. */
export function HeroStudy({ className }: SVGProps) {
  return (
    <svg
      viewBox="0 0 420 360"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* soft background panel */}
      <rect x="24" y="40" width="372" height="280" rx="32" fill="#ede9fe" />
      <circle cx="92" cy="92" r="16" fill="#fde68a" />
      <path
        d="M84 92h16M92 84v16"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* clouds */}
      <path
        d="M300 92c0-9 7-16 16-16 6 0 11 3 14 8 8 0 14 6 14 14s-6 14-14 14h-30c-7 0-13-6-13-13s6-13 13-13z"
        fill="#fff"
        opacity="0.9"
      />
      {/* paper plane */}
      <path d="M330 150l40-16-22 40-6-16-12-8z" fill="#a5b4fc" />
      <path
        d="M330 150l40-16-22 40-6-16-12-8z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* desk / chair block */}
      <rect x="120" y="150" width="150" height="150" rx="20" fill="#f59e0b" />

      {/* body */}
      <path
        d="M150 300c0-40 18-66 45-66s45 26 45 66"
        fill="#7c6cf0"
      />
      <path
        d="M150 300c0-40 18-66 45-66s45 26 45 66"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* head */}
      <circle cx="195" cy="196" r="30" fill="#fcd9b6" />
      <circle cx="195" cy="196" r="30" stroke="currentColor" strokeWidth="4" />
      {/* hair */}
      <path
        d="M168 188c2-18 16-30 27-30s25 12 27 30c-10-8-18-10-27-10s-17 2-27 10z"
        fill="#1f2937"
      />
      {/* grad cap */}
      <path d="M160 176l35-16 35 16-35 15-35-15z" fill="#1f2937" />
      <path d="M225 178v16" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <circle cx="225" cy="196" r="3.5" fill="#f59e0b" />
      {/* smile + eyes */}
      <circle cx="186" cy="198" r="2.6" fill="#1f2937" />
      <circle cx="204" cy="198" r="2.6" fill="#1f2937" />
      <path
        d="M188 208c3 4 13 4 16 0"
        stroke="#1f2937"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* arm pointing up */}
      <path
        d="M222 232c14-6 26-18 30-34"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* book in hand */}
      <rect x="150" y="246" width="46" height="34" rx="5" fill="#10b981" />
      <rect
        x="150"
        y="246"
        width="46"
        height="34"
        rx="5"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M173 246v34" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** Stack of books spot illustration. */
export function BooksStack({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="12" y="38" width="40" height="12" rx="3" fill="#a5b4fc" />
      <rect x="16" y="26" width="36" height="12" rx="3" fill="#fcd34d" />
      <rect x="10" y="14" width="38" height="12" rx="3" fill="#6ee7b7" />
      <g stroke="currentColor" strokeWidth="3">
        <rect x="12" y="38" width="40" height="12" rx="3" />
        <rect x="16" y="26" width="36" height="12" rx="3" />
        <rect x="10" y="14" width="38" height="12" rx="3" />
      </g>
    </svg>
  );
}

/** Trophy / achievement. */
export function Trophy({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path d="M20 12h24v12a12 12 0 0 1-24 0V12z" fill="#fcd34d" />
      <path
        d="M20 16H12v4a8 8 0 0 0 8 8M44 16h8v4a8 8 0 0 1-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 12h24v12a12 12 0 0 1-24 0V12z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="27" y="40" width="10" height="8" fill="#a5b4fc" />
      <rect x="22" y="48" width="20" height="6" rx="2" fill="#7c6cf0" />
      <g stroke="currentColor" strokeWidth="3">
        <rect x="27" y="40" width="10" height="8" />
        <rect x="22" y="48" width="20" height="6" rx="2" />
      </g>
    </svg>
  );
}

/** Lightbulb idea. */
export function Bulb({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="26" r="16" fill="#fde68a" />
      <circle cx="32" cy="26" r="16" stroke="currentColor" strokeWidth="3" />
      <path d="M26 42h12v6a6 6 0 0 1-12 0v-6z" fill="#a5b4fc" />
      <path
        d="M26 42h12v6a6 6 0 0 1-12 0v-6z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 10v-4M14 26h-4M54 26h-4M18 12l-3-3M46 12l3-3"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Target / goal. */
export function TargetDoodle({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="#fecaca" />
      <circle cx="32" cy="32" r="14" fill="#fff" />
      <circle cx="32" cy="32" r="6" fill="#ef4444" />
      <g stroke="currentColor" strokeWidth="3">
        <circle cx="32" cy="32" r="22" />
        <circle cx="32" cy="32" r="14" />
      </g>
      <path d="M32 32l20-20M48 12h6M54 12v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Friendly AI tutor mascot (used in chat). */
export function BotMascot({ className }: SVGProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="14" y="20" width="36" height="28" rx="10" fill="#c7d2fe" />
      <rect
        x="14"
        y="20"
        width="36"
        height="28"
        rx="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="26" cy="34" r="4" fill="#1f2937" />
      <circle cx="38" cy="34" r="4" fill="#1f2937" />
      <path d="M27 42h10" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 12v8M32 12a3 3 0 1 0 0-0.1" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="10" r="3.5" fill="#f59e0b" />
      <path d="M10 30v8M54 30v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
