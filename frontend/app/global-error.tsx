"use client";

import { useEffect } from "react";

/**
 * Catastrophic fallback — replaces the root layout (including <html>/<body>)
 * when an error escapes even the root. Kept dependency-free and self-styled so
 * it renders even if the app's CSS/providers failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #0b1020 100%)",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
            background: "rgba(17,23,38,0.7)",
            border: "1px solid rgba(148,163,184,0.2)",
            borderRadius: "1.5rem",
            padding: "2.5rem 2rem",
            boxShadow: "0 20px 45px -15px rgba(8,11,30,0.6)",
          }}
        >
          <div
            style={{
              margin: "0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "3.5rem",
              width: "3.5rem",
              borderRadius: "1rem",
              background:
                "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
              fontSize: "1.75rem",
            }}
            aria-hidden
          >
            🎓
          </div>
          <h1
            style={{
              marginTop: "1.5rem",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "#ffffff",
            }}
          >
            PrepGenius hit a snag
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              color: "#cbd5e1",
            }}
          >
            Something went wrong while loading the app. Please reload the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              padding: "0.625rem 1.5rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "#4f46e5",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
