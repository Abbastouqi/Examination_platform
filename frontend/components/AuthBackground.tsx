import React from "react";

/**
 * AuthBackground
 * --------------------------------------------------------------------------
 * Full-viewport, self-contained AI / tech themed backdrop for the auth pages.
 * Pure CSS gradients + inline SVG (data URI lives in globals.css) — no remote
 * images or fonts, so it works in locked-down environments.
 *
 * Layers (back -> front):
 *   1. Deep indigo -> navy gradient mesh base (.auth-bg-mesh)
 *   2. Faint neural-network / constellation SVG texture (.auth-bg-grid)
 *   3. Two soft blurred glowing orbs (brand + emerald) for depth
 *   4. A subtle vignette overlay to guarantee form contrast
 *
 * It renders as a `fixed` layer behind the page content (z-index 0, content
 * sits at z-10). Decorative only -> aria-hidden.
 */
export default function AuthBackground() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <div className="auth-bg-mesh" />
      <div className="auth-bg-grid" />
      <div className="auth-bg-orb auth-bg-orb--brand" />
      <div className="auth-bg-orb auth-bg-orb--accent" />
      <div className="auth-bg-vignette" />
    </div>
  );
}
