import { useEffect, useMemo, useState } from 'react';
import { Link, Search, Star, Trash2, RefreshCw, Filter, Unlink, X } from 'lucide-react';
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
  const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
  const [targetRaceId, setTargetRaceId] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);

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
      toast.success(
        `${data.programmes_linked + data.results_linked} document(s) lié(s)`
        + (data.manual_links_restored ? ` · ${data.manual_links_restored} correction(s) conservée(s)` : ''),
      );
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLinking(false);
    }
  };

  const handleCreateLink = async () => {
    if (!editingRaceId || !targetRaceId) return;
    setLinkBusy(true);
    try {
      await Admin.createRaceLink(editingRaceId, targetRaceId);
      toast.success('Liaison programme/résultat enregistrée');
      setTargetRaceId('');
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLinkBusy(false);
    }
  };

  const handleDeleteLink = async (targetRaceIdToRemove: string) => {
    if (!editingRaceId) return;
    if (!window.confirm('Retirer cette liaison programme/résultat ?')) return;
    setLinkBusy(true);
    try {
      await Admin.deleteRaceLink(editingRaceId, targetRaceIdToRemove);
      toast.success('Liaison retirée');
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLinkBusy(false);
    }
  };

  if (loading) return <CenteredSpinner label="Chargement des courses…" />;

  const linkedTargets = (race: Race) => [
    ...(race.linked_programmes || []),
    ...(race.linked_results || []),
  ];
  const editingRace = races.find((race) => race.race_id === editingRaceId) || null;
  const editingLinkedIds = new Set(editingRace ? linkedTargets(editingRace).map((race) => race.race_id) : []);
  const linkCandidates = editingRace
    ? races
        .filter((race) => race.race_id !== editingRace.race_id)
        .filter((race) => race.doc_type !== editingRace.doc_type)
        .filter((race) => !editingLinkedIds.has(race.race_id))
        .sort((a, b) => {
          const aSameDate = Boolean(a.date_iso && a.date_iso === editingRace.date_iso);
          const bSameDate = Boolean(b.date_iso && b.date_iso === editingRace.date_iso);
          if (aSameDate !== bSameDate) return aSameDate ? -1 : 1;
          return (b.date_iso || '').localeCompare(a.date_iso || '');
        })
    : [];

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={`${races.length} course(s) en base`}
        action={
          <div className="flex gap-2">
            <button onClick={handleLinkRelated} disabled={linking} className="btn-secondary">
              <Link size={14} /> {linking ? 'Actualisation…' : 'Actualiser les liaisons auto'}
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
                        {linkedTargets(r).length > 0 && (
                          <div className="mt-1 space-y-1">
                            {linkedTargets(r).map((linked) => (
                              <div key={linked.race_id} className="text-xs text-fg-subtle flex items-center gap-1">
                                <Link size={12} className="text-accent" />
                                <span>
                                  Lié au {linked.doc_type === 'result' ? 'résultat' : 'programme'} : {linked.name || linked.race_id}
                                </span>
                              </div>
                            ))}
                          </div>
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
                        onClick={() => {
                          setEditingRaceId(r.race_id);
                          setTargetRaceId('');
                        }}
                        className="btn-secondary"
                        title="Gérer les liaisons programme/résultat"
                      >
                        <Link size={14} />
                        Liens
                      </button>
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

      {editingRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Correction manuelle</p>
                <h2 className="mt-1 text-xl font-semibold text-fg">Liaisons programme/résultat</h2>
                <p className="mt-1 text-sm text-fg-muted">{editingRace.name}</p>
                <p className="mt-1 text-xs font-mono text-fg-subtle">{editingRace.race_id}</p>
              </div>
              <button
                className="btn-ghost p-2"
                onClick={() => setEditingRaceId(null)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <p className="label">Liaisons actuelles</p>
              {linkedTargets(editingRace).length ? (
                <div className="space-y-2">
                  {linkedTargets(editingRace).map((linked) => (
                    <div key={linked.race_id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{linked.name || linked.race_id}</p>
                        <p className="mt-1 text-xs text-fg-subtle">
                          {linked.doc_type === 'result' ? 'Résultat' : 'Programme'} · {linked.date_text || linked.date_iso || 'Date inconnue'}
                        </p>
                      </div>
                      <button
                        className="btn-danger shrink-0"
                        disabled={linkBusy}
                        onClick={() => handleDeleteLink(linked.race_id)}
                      >
                        <Unlink size={14} /> Retirer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-fg-muted">
                  Aucune liaison enregistrée.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <label htmlFor="target-race" className="label">Ajouter une liaison</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="target-race"
                  value={targetRaceId}
                  onChange={(event) => setTargetRaceId(event.target.value)}
                  className="input flex-1"
                >
                  <option value="">Sélectionner {editingRace.doc_type === 'result' ? 'un programme' : 'un résultat'}…</option>
                  {linkCandidates.map((candidate) => (
                    <option key={candidate.race_id} value={candidate.race_id}>
                      {candidate.date_iso === editingRace.date_iso ? 'Même date · ' : ''}
                      {candidate.name} · {candidate.date_text || candidate.date_iso || 'Date inconnue'}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  disabled={!targetRaceId || linkBusy}
                  onClick={handleCreateLink}
                >
                  <Link size={14} /> {linkBusy ? 'Enregistrement…' : 'Lier'}
                </button>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                Les documents de la même date apparaissent en premier. Cette correction sera conservée lors des prochaines liaisons automatiques.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
