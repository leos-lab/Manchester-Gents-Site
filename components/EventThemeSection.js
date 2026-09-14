"use client";

import { useMemo } from "react";

export default function EventThemeSection({ palette = {}, children }) {
  const styles = useMemo(() => {
    const primary = palette.primaryColor || "var(--color-gold)";
    const accent = palette.accentColor || "var(--color-amber)";
    const background = palette.backgroundColor || "rgba(13, 21, 34, 0.8)";
    const text = palette.textColor || "var(--color-body)";
    return {
      "--event-primary": primary,
      "--event-accent": accent,
      "--event-background": background,
      "--event-text": text,
    };
  }, [palette]);

  return (
    <section className="event-themed-section" style={styles}>
      {children}
      <style jsx>{`
        .event-themed-section {
          background: var(--event-background);
          color: var(--event-text);
          border-radius: 28px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 40px rgba(7, 13, 24, 0.4);
        }
      `}</style>
    </section>
  );
}
