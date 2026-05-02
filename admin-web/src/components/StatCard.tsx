import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted font-medium">{label}</p>
          <p className="text-3xl font-semibold text-fg mt-2 tabular-nums">{value}</p>
          {trend && <p className="text-xs text-fg-subtle mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-md bg-bg-elevated border border-border flex items-center justify-center text-accent">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
