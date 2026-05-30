import { useState } from 'react';
import { Search, ExternalLink, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { Admin, LonabImportPreviewItem, apiError } from '@/lib/api';

const DEFAULT_SOURCE = 'https://lonab.bf/fr/resultats-gains-pmub?page=0';

export default function ArchiveImport() {
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE);
  const [maxPages, setMaxPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LonabImportPreviewItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

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
      setErrors(data.errors || []);
      toast.success(`${data.count} PDF detecte(s)`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Import LONAB"
        subtitle="Decouvrez les PDF disponibles sur les archives LONAB avant import en masse."
      />

      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
            URL archive
          </label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="input w-full"
            placeholder={DEFAULT_SOURCE}
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
          Cette version ne lance pas encore le parsing en masse. Elle verifie d'abord la
          decouverte des PDF, le type probable de document et les liens sources. L'import
          automatique viendra ensuite avec deduplication et revue des fichiers incertains.
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
        </div>
        <div className="card divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-fg-muted">
              Lancez une previsualisation pour voir les PDF disponibles.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.pdf_url} className="p-4 flex items-start gap-3">
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
    </div>
  );
}
