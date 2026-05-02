import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-fg-muted">
      <Spinner size={24} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
