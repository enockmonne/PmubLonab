import { useEffect, useMemo, useState } from 'react';
import { Search, ExternalLink, AlertTriangle, FileText, DownloadCloud, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { Admin, LonabImportPreviewItem, LonabImportResult, LonabRecentImport, apiError } from '@/lib/api';

const LONAB_SOURCES = {
  programmes: {
    label: 'Programmes PMU\'B',
    url: 'https://lonab.bf/fr/programme-pmub?page=0',
    description: 'Journal hippique et programmes avant course.',
  },
  results: {
    label: 'Resultats / Gains PMU\'B',
    url: 'https://lonab.bf/fr/resultats-gains-pmub?page=0',
    description: 'Rapports, resultats officiels et gains apres course.',
  },
  custom: {
    label: 'URL LONAB personnalisee',
    url: '',
    description: 'Pour tester une autre page LONAB contenant des liens PDF.',
  },
} as const;

type LonabSourceKey = keyof typeof LONAB_SOURCES;
type ImportResultFilter = 'all' | LonabImportResult['status'];

const DEFAULT_SOURCE_TYPE: LonabSourceKey = 'programmes';
const DEFAULT_SOURCE = LONAB_SOURCES[DEFAULT_SOURCE_TYPE].url;

export default function ArchiveImport() {
  const [sourceType, setSourceType] = useState<LonabSourceKey>(DEFAULT_SOURCE_TYPE);
  const [sourceUrl, setSourceUrl] = useState<string>(DEFAULT_SOURCE);
  const [maxPages, setMaxPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState<LonabImportPreviewItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<LonabImportResult[]>([]);
  const [resultFilter, setResultFilter] = useState<ImportResultFilter>('all');
  const [recentImports, setRecentImports] = useState<LonabRecentImport[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const resultCounts = useMemo(
    () => ({
      all: importResults.length,
      imported: importResults.filter((result) => result.status === 'imported').length,
      skipped: importResults.filter((result) => result.status === 'skipped').length,
      error: importResults.filter((result) => result.status === 'error').length,
    }),
    [importResults]
  );

  const filteredImportResults = useMemo(
    () =>
      resultFilter === 'all'
        ? importResults
        : importResults.filter((result) => result.status === resultFilter),
    [importResults, resultFilter]
  );

  const failedImportUrls = useMemo(
    () => importResults.filter((result) => result.status === 'error').map((result) => result.pdf_url),
    [importResults]
  );

  const loadRecent = async () => {
    try {
      const { data } = await Admin.listLonabImports(10);
      setRecentImports(data.imports);
    } catch {
      setRecentImports([]);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const changeSourceType = (nextType: LonabSourceKey) => {
    setSourceType(nextType);
    setItems([]);
    setSelected([]);
    setImportResults([]);
    setResultFilter('all');
    setErrors([]);
    if (nextType !== 'custom') {
      setSourceUrl(LONAB_SOURCES[nextType].url);
    }
  };

  const preview = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const { data } = await Admin.previewLonabArchive({
        source_url: sourceUrl,
        max_pages: maxPages,
        limit,
        follow_detail_pages: true,
      });
      setItems(data.items);
      setSelected(data.items.slice(0, 5).map((item) => item.pdf_url));
      setImportResults([]);
      setResultFilter('all');
      setErrors(data.errors || []);
      toast.success(`${data.count} PDF detecte(s)`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (pdfUrl: string) => {
    setSelected((prev) =>
      prev.includes(pdfUrl)
        ? prev.filter((url) => url !== pdfUrl)
        : prev.length >= 5
          ? prev
          : [...prev, pdfUrl]
    );
  };

  const importSelected = async () => {
    if (selected.length === 0) {
      toast.error('Selectionnez au moins un PDF');
      return;
    }
    setImporting(true);
    try {
      const { data } = await Admin.importLonabPdfs(selected);
      setImportResults(data.results);
      setResultFilter(data.errors > 0 ? 'error' : 'all');
      loadRecent();
      toast.success(`${data.imported} importe(s), ${data.skipped} ignore(s), ${data.errors} erreur(s)`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setImporting(false);
    }
  };

  const retryFailedImports = async () => {
    if (failedImportUrls.length === 0) {
      toast.error('Aucun import en erreur a relancer');
      return;
    }
    setImporting(true);
    try {
      const { data } = await Admin.importLonabPdfs(failedImportUrls.slice(0, 5));
      setImportResults(data.results);
      setResultFilter(data.errors > 0 ? 'error' : 'all');
      loadRecent();
      toast.success(`${data.imported} importe(s), ${data.skipped} ignore(s), ${data.errors} erreur(s)`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Import LONAB"
        subtitle="Choisissez les programmes ou les resultats/gains LONAB, puis importez seulement les PDF utiles."
      />

      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
            Source LONAB
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(LONAB_SOURCES) as LonabSourceKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeSourceType(key)}
                className={`rounded-md border p-3 text-left transition ${
                  sourceType === key
                    ? 'border-accent bg-accent/10 text-fg'
                    : 'border-border bg-bg-elevated text-fg-muted hover:text-fg'
                }`}
              >
                <span className="block text-sm font-semibold">{LONAB_SOURCES[key].label}</span>
                <span className="mt-1 block text-xs leading-relaxed">{LONAB_SOURCES[key].description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
            URL utilisee
          </label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="input w-full"
            placeholder={DEFAULT_SOURCE}
            readOnly={sourceType !== 'custom'}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
              Pages
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
              Limite PDF
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div className="flex items-end">
            <button onClick={preview} disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : <Search size={16} />}
              {loading ? 'Recherche...' : 'Previsualiser'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-bg-elevated/50 p-3">
        <p className="text-xs text-fg-muted leading-relaxed">
          Selectionnez jusqu'a 5 PDF par lot. Chaque fichier est telecharge, hashe pour
          eviter les doublons, puis parse avec le pipeline existant. Les fichiers incertains
          restent visibles dans le resultat d'import.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 card divide-y divide-border">
          {errors.map((err) => (
            <div key={err} className="p-3 flex gap-2 text-sm text-danger">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="break-all">{err}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-fg">
            {items.length} PDF detecte{items.length > 1 ? 's' : ''}
          </h2>
          {items.length > 0 && (
            <button onClick={importSelected} disabled={importing || selected.length === 0} className="btn-primary">
              {importing ? <Spinner /> : <DownloadCloud size={16} />}
              {importing ? 'Import en cours...' : `Importer (${selected.length}/5)`}
            </button>
          )}
        </div>
        <div className="card divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-fg-muted">
              Lancez une previsualisation pour voir les PDF disponibles.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.pdf_url} className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(item.pdf_url)}
                  onChange={() => toggleSelected(item.pdf_url)}
                  disabled={!selected.includes(item.pdf_url) && selected.length >= 5}
                  className="mt-1"
                />
                <FileText size={20} className="text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {item.title || item.filename}
                  </p>
                  <p className="text-xs text-fg-subtle mt-1 font-mono truncate">
                    {item.filename}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="badge bg-bg-elevated text-fg-muted">{item.doc_type}</span>
                    <a
                      href={item.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="badge bg-accent/15 text-accent"
                    >
                      <ExternalLink size={12} /> PDF
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {importResults.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg">Resultat import</h2>
              <p className="mt-1 text-xs text-fg-muted">
                Filtrez le dernier lot pour verifier rapidement les imports, doublons et erreurs.
              </p>
            </div>
            {failedImportUrls.length > 0 && (
              <button
                type="button"
                onClick={retryFailedImports}
                disabled={importing}
                className="btn-secondary w-full justify-center lg:w-auto"
              >
                {importing ? <Spinner /> : <RotateCcw size={16} />}
                Relancer erreurs ({failedImportUrls.length})
              </button>
            )}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {([
              ['all', 'Tous'],
              ['imported', 'Importes'],
              ['skipped', 'Ignores'],
              ['error', 'Erreurs'],
            ] as [ImportResultFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setResultFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  resultFilter === key
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-bg-elevated text-fg-muted hover:text-fg'
                }`}
              >
                {label} ({resultCounts[key]})
              </button>
            ))}
          </div>
          <div className="card divide-y divide-border">
            {filteredImportResults.length === 0 ? (
              <div className="p-6 text-center text-sm text-fg-muted">
                Aucun fichier dans ce filtre.
              </div>
            ) : filteredImportResults.map((result) => (
              <div key={result.pdf_url} className="p-4 flex items-start gap-3">
                {result.status === 'imported' ? (
                  <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle
                    size={18}
                    className={
                      result.status === 'skipped'
                        ? 'text-fg-muted shrink-0 mt-0.5'
                        : 'text-danger shrink-0 mt-0.5'
                    }
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {result.name || result.filename}
                  </p>
                  <p className="text-xs text-fg-subtle font-mono truncate">
                    {result.race_id || result.pdf_url}
                  </p>
                  {result.error && <p className="text-xs text-danger mt-1 break-words">{result.error}</p>}
                </div>
                <span className="badge bg-bg-elevated text-fg-muted">{result.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-fg mb-3">Imports LONAB recents</h2>
        <div className="card divide-y divide-border">
          {recentImports.length === 0 ? (
            <div className="p-6 text-center text-sm text-fg-muted">
              Aucun import LONAB enregistre pour le moment.
            </div>
          ) : (
            recentImports.map((item) => (
              <div key={item.race_id} className="p-4 flex items-start gap-3">
                <FileText size={18} className="text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{item.name}</p>
                  <p className="text-xs text-fg-subtle truncate">
                    {item.date_text || item.date_iso || '-'} - {item.location || '-'}
                  </p>
                  <p className="text-xs text-fg-subtle font-mono truncate mt-1">
                    {item.import_source?.filename || item.race_id}
                  </p>
                </div>
                <span className="badge bg-bg-elevated text-fg-muted">{item.doc_type || 'doc'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
