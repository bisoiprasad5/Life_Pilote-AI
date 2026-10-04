import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    outline: 'bg-transparent text-slate-400 border-slate-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-medium tracking-wide',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
    case 'URGENT':
      return <Badge variant="danger" size="sm">CRITICAL</Badge>;
    case 'HIGH':
      return <Badge variant="warning" size="sm">HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="primary" size="sm">MEDIUM</Badge>;
    case 'LOW':
    default:
      return <Badge variant="default" size="sm">LOW</Badge>;
  }
}

export function CategoryBadge({ category }: { category: string }) {
  const cat = category?.toUpperCase() || 'OTHER';
  switch (cat) {
    case 'STUDY':
      return <Badge variant="purple" size="sm">STUDY</Badge>;
    case 'WORK':
      return <Badge variant="primary" size="sm">WORK</Badge>;
    case 'HEALTH':
      return <Badge variant="success" size="sm">HEALTH</Badge>;
    case 'FITNESS':
      return <Badge variant="warning" size="sm">FITNESS</Badge>;
    case 'FINANCE':
      return <Badge variant="success" size="sm">FINANCE</Badge>;
    case 'PERSONAL':
      return <Badge variant="default" size="sm">PERSONAL</Badge>;
    default:
      return <Badge variant="outline" size="sm">{cat}</Badge>;
  }
}
