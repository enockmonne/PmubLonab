import { useEffect, useMemo, useState } from 'react';
import { Link, Search, Star, Trash2, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { Admin, Race, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { CenteredSpinner } from '@/components/Spinner';
import { formatDate } from '@/lib/utils';

type DocFilter = 'all' | 'programme' | 'result';

export default function Races() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DocFilter>('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await Admin.listRaces();
      setRaces(data.races || []);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return races.filter((r) => {
      if (filter !== 'all' && r.doc_type !== filter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.race_id?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.date_text?.toLowerCase().includes(q)
      );
    });
  }, [races, search, filter]);

  const handleSetCurrent = async (race_id: string) => {
    setBusyId(race_id);
    try {
      await Admin.setCurrent(race_id);
      toast.success('Course active mise à jour');
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (race_id: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement « ${name} » ?`)) return;
    setBusyId(race_id);
    try {
      await Admin.deleteRace(race_id);
      toast.success('Course supprimée');
      setRaces((prev) => prev.filter((r) => r.race_id !== race_id));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleLinkRelated = async () => {
    setLinking(true);
    try {
      const { data } = await Admin.linkRelatedRaces();
      toast.success(`${data.programmes_linked + data.results_linked} document(s) lie(s)`);
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLinking(false);
    }
  };

  if (loading) return <CenteredSpinner label="Chargement des courses…" />;

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={`${races.length} course(s) en base`}
        action={
          <div className="flex gap-2">
            <button onClick={handleLinkRelated} disabled={linking} className="btn-secondary">
              <Link size={14} /> {linking ? 'Liaison...' : 'Lier'}
            </button>
            <button onClick={load} className="btn-secondary">
              <RefreshCw size={14} /> Actualiser
            </button>
          </div>
        }
      />

      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, lieu, ID…)"
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-fg-subtle" />
          {(['all', 'programme', 'result'] as DocFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              {f === 'all' ? 'Tout' : f === 'programme' ? 'Programmes' : 'Résultats'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-fg-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Lieu</th>
                <th className="text-left px-4 py-3 font-medium">Créé</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-fg-muted">
                    Aucune course
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.race_id} className="hover:bg-bg-elevated/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.is_current && <Star size={14} className="text-warning fill-warning" />}
                      <div>
                        <p className="font-medium text-fg">{r.name}</p>
                        <p className="text-xs text-fg-subtle font-mono">{r.race_id}</p>
                        {((r.linked_programmes_count || 0) + (r.linked_results_count || 0)) > 0 && (
                          <span className="badge bg-bg-elevated text-fg-muted mt-1" title="Programme/resultat lie">
                            <Link size={12} />
                            Lie
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.doc_type === 'result'
                          ? 'badge bg-success/15 text-success'
                          : 'badge bg-accent/15 text-accent'
                      }
                    >
                      {r.doc_type === 'result' ? 'Résultat' : 'Programme'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{r.date_text || '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{r.location || '—'}</td>
                  <td className="px-4 py-3 text-fg-subtle text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!r.is_current && (
                        <button
                          onClick={() => handleSetCurrent(r.race_id)}
                          disabled={busyId === r.race_id}
                          className="btn-secondary"
                          title="Définir comme course active"
                        >
                          <Star size={14} />
                          Activer
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.race_id, r.name)}
                        disabled={busyId === r.race_id}
                        className="btn-danger"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
