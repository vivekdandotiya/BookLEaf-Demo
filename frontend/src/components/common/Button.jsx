import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-brand text-white hover:bg-brand-hover focus:ring-brand shadow-sm active:bg-brand-dark',
    secondary:
      'bg-ink-900 text-white hover:bg-ink-800 focus:ring-ink-900 shadow-sm active:bg-ink-950',
    outline:
      'border border-paper-300 text-ink-800 bg-white hover:bg-paper-100 focus:ring-ink-500 shadow-xs',
    ghost:
      'text-ink-700 hover:bg-paper-200 hover:text-ink-900 focus:ring-ink-400',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 shadow-sm active:bg-red-800',
    success:
      'bg-sage text-white hover:bg-sage-dark focus:ring-sage shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
