import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = BookOpen,
  title = 'No items found',
  description = 'There are currently no items to display in this view.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-paper-200/80 my-4">
      <div className="w-14 h-14 rounded-2xl bg-paper-100 flex items-center justify-center text-ink-600 mb-4 border border-paper-200">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-ink-900 tracking-tight">{title}</h3>
      <p className="text-sm text-ink-500 max-w-sm mt-1.5 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
