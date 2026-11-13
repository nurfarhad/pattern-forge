// ─── Section — Toolcraft-style 36px collapsible header with scoped reset ─────
import React, { useState } from 'react';
import './Panel.css';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
  onReset?: () => void;
}

export const Panel: React.FC<PanelProps> = ({ title, children, defaultOpen = true, id, onReset }) => {
  const [open, setOpen] = useState(() => {
    try {
      const saved = id ? localStorage.getItem(`pf:section:${id}`) : null;
      return saved === null ? defaultOpen : saved === '1';
    } catch { return defaultOpen; }
  });
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { if (id) localStorage.setItem(`pf:section:${id}`, next ? '1' : '0'); } catch { /* sandboxed */ }
  };

  return (
    <section className={`tc-section ${open ? 'is-open' : ''}`} id={id}>
      <div className="tc-section__header">
        <button type="button" className="tc-section__title" onClick={toggle} aria-expanded={open}>
          {title}
        </button>
        {onReset && (
          <button type="button" className="tc-icon-btn" onClick={onReset} title={`Reset ${title}`} aria-label={`Reset ${title}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.2 6a3.8 3.8 0 1 0 1.1-2.7M2.2 1.6v2.1h2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <button type="button" className="tc-icon-btn tc-section__chevron" onClick={toggle} aria-label={open ? `Collapse ${title}` : `Expand ${title}`}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75 5 6.25l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="tc-section__body-wrap" aria-hidden={!open}>
        <div className="tc-section__body">{children}</div>
      </div>
    </section>
  );
};
