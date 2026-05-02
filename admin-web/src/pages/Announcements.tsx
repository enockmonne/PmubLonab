import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Admin, Announcement, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { CenteredSpinner } from '@/components/Spinner';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Level = 'info' | 'warning' | 'critical';

const LEVEL_META: Record<Level, { label: string; icon: typeof Info; color: string }> = {
  info: { label: 'Info', icon: Info, color: 'text-accent' },
  warning: { label: 'Avertissement', icon: AlertTriangle, color: 'text-warning' },
  critical: { label: 'Critique', icon: AlertCircle, color: 'text-danger' },
};

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<Level>('info');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await Admin.listAnnouncements();
      setItems(data.announcements || []);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await Admin.createAnnouncement(message.trim(), level);
      toast.success('Annonce publiée');
      setMessage('');
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    try {
      await Admin.deleteAnnouncement(id);
      toast.success('Annonce supprimée');
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Annonces"
        subtitle="Bandeau visible en haut de l'app mobile. Une seule annonce active à la fois."
      />

      <form onSubmit={handleCreate} className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
          <Plus size={14} /> Nouvelle annonce
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Ex: Maintenance prévue dimanche…"
              maxLength={300}
            />
            <p className="text-xs text-fg-subtle mt-1">{message.length} / 300</p>
          </div>
          <div>
            <label className="label">Niveau</label>
            <div className="flex gap-2">
              {(Object.keys(LEVEL_META) as Level[]).map((l) => {
                const M = LEVEL_META[l];
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={cn(
                      'btn',
                      level === l
                        ? 'bg-bg-elevated border border-accent text-fg'
                        : 'bg-bg-elevated border border-border text-fg-muted'
                    )}
                  >
                    <M.icon size={14} className={M.color} />
                    {M.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting || !message.trim()} className="btn-primary">
              <Megaphone size={14} /> Publier
            </button>
          </div>
        </div>
      </form>

      <h2 className="text-sm font-semibold text-fg mb-3 uppercase tracking-wide">
        Historique
      </h2>
      {loading ? (
        <CenteredSpinner />
      ) : items.length === 0 ? (
        <div className="card p-6 text-center text-fg-muted">Aucune annonce</div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const M = LEVEL_META[(a.level as Level) || 'info'] || LEVEL_META.info;
            return (
              <div key={a.id} className="card p-4 flex items-start gap-3">
                <M.icon size={18} className={cn('shrink-0 mt-0.5', M.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg">{a.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span
                      className={
                        a.active
                          ? 'badge bg-success/15 text-success'
                          : 'badge bg-bg-elevated text-fg-subtle'
                      }
                    >
                      {a.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-fg-subtle">{formatDate(a.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="btn-danger shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
