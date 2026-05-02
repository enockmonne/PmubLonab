import { useEffect, useState } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { Admin, AdminLog, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { CenteredSpinner } from '@/components/Spinner';
import { formatDate, formatRelative } from '@/lib/utils';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'auth.login': { label: 'Connexion', color: 'bg-accent/15 text-accent' },
  'race.upload': { label: 'Upload course', color: 'bg-success/15 text-success' },
  'race.delete': { label: 'Suppression course', color: 'bg-danger/15 text-danger' },
  'race.set_current': { label: 'Course active', color: 'bg-warning/15 text-warning' },
  'announcement.create': { label: 'Annonce créée', color: 'bg-accent/15 text-accent' },
  'announcement.delete': { label: 'Annonce supprimée', color: 'bg-danger/15 text-danger' },
};

export default function Logs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await Admin.listLogs(100);
      setLogs(data.logs || []);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Activité admin"
        subtitle="Historique des actions réalisées par les administrateurs"
        action={
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={14} /> Actualiser
          </button>
        }
      />

      {loading ? (
        <CenteredSpinner />
      ) : logs.length === 0 ? (
        <div className="card p-6 text-center text-fg-muted">Aucune activité enregistrée</div>
      ) : (
        <div className="card divide-y divide-border">
          {logs.map((log, idx) => {
            const meta = ACTION_LABELS[log.action] || {
              label: log.action,
              color: 'bg-bg-elevated text-fg-muted',
            };
            return (
              <div key={log.id || idx} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-bg-elevated border border-border flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${meta.color}`}>{meta.label}</span>
                    <span className="text-sm text-fg font-medium">{log.admin_email || '—'}</span>
                  </div>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <pre className="text-xs text-fg-subtle mt-2 font-mono bg-bg-elevated p-2 rounded border border-border overflow-x-auto">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-fg">{formatRelative(log.created_at)}</p>
                  <p className="text-[10px] text-fg-subtle">{formatDate(log.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
