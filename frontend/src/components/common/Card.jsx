import React from 'react';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-paper-200/90 shadow-xs overflow-hidden ${
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-paper-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`px-6 py-5 border-b border-paper-200/80 flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-serif text-lg font-semibold text-ink-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardBody = ({ children, className = '' }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 bg-paper-50/60 border-t border-paper-200/70 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
};
