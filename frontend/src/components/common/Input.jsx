import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  id,
  className = '',
  required = false,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:bg-paper-100 disabled:cursor-not-allowed ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-paper-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-ink-400">{helperText}</p>}
    </div>
  );
};

export const Textarea = ({
  label,
  error,
  helperText,
  id,
  className = '',
  required = false,
  rows = 4,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:bg-paper-100 disabled:cursor-not-allowed ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-paper-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-ink-400">{helperText}</p>}
    </div>
  );
};
