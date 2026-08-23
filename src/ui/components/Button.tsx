// ─── Button component ─────────────────────────────────────────────────────────
import React from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  id?: string;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'secondary', size = 'md', onClick,
  disabled, title, id, type = 'button', fullWidth,
}) => (
  <button
    id={id}
    type={type}
    className={`pf-btn pf-btn--${variant} pf-btn--${size} ${fullWidth ? 'pf-btn--full' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={typeof children === 'string' ? children : title}
  >
    {children}
  </button>
);
