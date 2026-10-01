import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Link2Off, RefreshCw, RotateCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import Spinner, { CenteredSpinner } from '@/components/Spinner';
import {
  Admin,
  CorpusQualitySummary,
  LonabImportAttempt,
  QualityDocument,
  apiError,
} from '@/lib/api';

type ReviewStatus = 'all' | 'review' | 'clean';
type IssueFilter = 'all' | 'warnings' | 'unlinked';
type DocType = 'all' | 'programme' | 'result';

export default function Quality() {
  const [documents, setDocuments] = useState<QualityDocument[]>([]);
  const [summary, setSummary] = useState<CorpusQualitySummary | null>(null);
  const [attempts, setAttempts] = useState<LonabImportAttempt[]>([]);
  const [status, setStatus] = useState<ReviewStatus>('review');
  const [issue, setIssue] = useState<IssueFilter>('all');
  const [docType, setDocType] = useState<DocType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qualityResponse, attemptsResponse] = await Promise.all([
        Admin.listQualityDocuments({ status, issue, doc_type: docType, search, limit: 200 }),
        Admin.listLonabAttempts('error', 50),
      ]);
      setDocuments(qualityResponse.data.documents);
      setSummary(qualityResponse.data.summary);
      setAttempts(attemptsResponse.data.attempts);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [docType, issue, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const retry = async (attempt: LonabImportAttempt) => {
    setRetrying(attempt.pdf_url);
    try {
      const { data } = await Admin.retryLonabPdfs([attempt.pdf_url]);
      if (data.errors) toast.error('La relance a encore échoué. Consultez le nouveau détail.');
      else toast.success(data.imported ? 'Import terminé' : 'PDF déjà présent dans le corpus');
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Qualité des données"
        subtitle="Contrôlez les extractions, les liaisons programme–résultat et les imports LONAB en échec."
        action={(
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Actualiser
          </button>
        )}
      />

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="À vérifier" value={summary.documents_to_review} warning />
          <Metric label="Non liés" value={summary.unlinked_documents} />
          <Metric label="Avec avertissements" value={summary.documents_with_warnings} />
          <Metric label="Propres" value={summary.clean_documents} success />
        </div>
      )}

      <div className="card mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              className="input w-full pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, lieu, date ou identifiant…"
            />
          </div>
          <Select value={status} onChange={(value) => setStatus(value as ReviewStatus)} options={[
            ['review', 'À vérifier'], ['clean', 'Propres'], ['all', 'Tous les états'],
          ]} />
          <Select value={issue} onChange={(value) => setIssue(value as IssueFilter)} options={[
            ['all', 'Tous les problèmes'], ['warnings', 'Extraction'], ['unlinked', 'Non liés'],
          ]} />
          <Select value={docType} onChange={(value) => setDocType(value as DocType)} options={[
            ['all', 'Tous les types'], ['programme', 'Programmes'], ['result', 'Résultats'],
          ]} />
        </div>
      </div>

      {loading ? <CenteredSpinner label="Analyse du corpus…" /> : (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg">Documents ({documents.length})</h2>
          <div className="card divide-y divide-border">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-sm text-fg-muted">Aucun document ne correspond à ces filtres.</div>
            ) : documents.map((document) => (
              <div key={document.race_id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {document.review_status === 'clean'
                        ? <CheckCircle2 size={17} className="text-success" />
                        : <AlertTriangle size={17} className="text-warning" />}
                      <p className="font-medium text-fg">{document.name}</p>
                      <span className="badge bg-bg-elevated text-fg-muted">{document.doc_type}</span>
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">
                      {document.date_text || document.date_iso || 'Date inconnue'} · {document.location || 'Lieu inconnu'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {document.issues.includes('unlinked') && (
                        <span className="badge bg-warning/15 text-warning"><Link2Off size={12} /> Document non lié</span>
                      )}
                      {(document.parse_quality?.warnings || []).map((warning) => (
                        <span key={warning} className="badge bg-danger/10 text-danger">{warning}</span>
                      ))}
                    </div>
                  </div>
                  <RouterLink className="btn-secondary shrink-0" to={`/races?search=${encodeURIComponent(document.race_id)}`}>
                    Ouvrir le corpus <ExternalLink size={13} />
                  </RouterLink>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-1 text-sm font-semibold text-fg">Imports LONAB à relancer ({attempts.length})</h2>
        <p className="mb-3 text-xs text-fg-muted">
          Les imports par URL peuvent être relancés ici. Pour un upload manuel, sélectionnez de nouveau le PDF dans la page Upload PDF.
        </p>
        <div className="card divide-y divide-border">
          {attempts.length === 0 ? (
            <div className="p-6 text-center text-sm text-fg-muted">Aucun import LONAB en échec.</div>
          ) : attempts.map((attempt) => (
            <div key={attempt.id || attempt.pdf_url} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <AlertTriangle size={18} className="shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{attempt.filename}</p>
                <p className="mt-1 text-xs text-danger break-words">{attempt.error || 'Erreur inconnue'}</p>
                <p className="mt-1 text-xs text-fg-subtle">{attempt.attempt_count} tentative(s)</p>
              </div>
              <button className="btn-secondary shrink-0" onClick={() => retry(attempt)} disabled={retrying !== null}>
                {retrying === attempt.pdf_url ? <Spinner /> : <RotateCcw size={14} />} Relancer
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, warning, success }: { label: string; value: number; warning?: boolean; success?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-semibold ${warning ? 'text-warning' : success ? 'text-success' : 'text-fg'}`}>{value}</p>
      <p className="mt-1 text-xs text-fg-muted">{label}</p>
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select className="input min-w-44" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}
