// ─── Collapsible panel section ────────────────────────────────────────────────
import React, { useState } from 'react';
import './Panel.css';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
}

export const Panel: React.FC<PanelProps> = ({ title, children, defaultOpen = true, id }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`pf-panel ${open ? 'pf-panel--open' : ''}`} id={id}>
      <button className="pf-panel__header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="pf-panel__title">{title}</span>
        <svg className="pf-panel__chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="pf-panel__body">{children}</div>}
    </section>
  );
};
