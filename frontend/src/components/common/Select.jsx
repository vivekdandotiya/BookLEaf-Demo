import React from 'react';

export const Select = ({
  label,
  error,
  helperText,
  id,
  options = [],
  className = '',
  required = false,
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-ink-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-ink-900 transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:bg-paper-100 disabled:cursor-not-allowed ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-paper-300'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-ink-400">{helperText}</p>}
    </div>
  );
};
