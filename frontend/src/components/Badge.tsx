import { ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'info' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export default function Badge({ children, variant = 'info', className }: BadgeProps) {
  const variants = {
    success: 'bg-accent-500 text-blue-900',
    info: 'bg-blue-200 text-blue-700',
    warning: 'bg-warning text-gray-900',
    error: 'bg-error text-white',
    neutral: 'bg-gray-100 text-gray-700',
  };
  
  return (
    <span
      className={clsx(
        'inline-flex items-center h-6 px-3 rounded-badge text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
