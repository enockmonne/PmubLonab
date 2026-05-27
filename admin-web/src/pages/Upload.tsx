import { useCallback, useState } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Admin, apiError, ParseQuality } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { cn } from '@/lib/utils';

interface FileItem {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  raceId?: string;
  summary?: {
    name: string;
    date?: string;
    runners: number;
    horses_parsed: number;
    doc_type?: string;
    parse_quality?: ParseQuality;
  };
}

export default function Upload() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (arr.length === 0) {
      toast.error('Aucun PDF détecté');
      return;
    }
    setItems((prev) => [
      ...prev,
      ...arr.map((file) => ({ file, status: 'pending' as const, progress: 0 })),
    ]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const startUpload = async () => {
    if (uploading) return;
    const pending = items.filter((i) => i.status === 'pending');
    if (pending.length === 0) {
      toast.error('Aucun fichier en attente');
      return;
    }
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== 'pending') continue;
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading' as const } : it))
      );
      try {
        const { data } = await Admin.uploadRace(items[i].file, (p) => {
          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, progress: p } : it)));
        });
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'success' as const,
                  progress: 100,
                  raceId: data.race_id,
                  summary: data.summary,
                }
              : it
          )
        );
        successCount++;
      } catch (err) {
        const msg = apiError(err);
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error' as const, error: msg } : it
          )
        );
        errorCount++;
      }
    }
    setUploading(false);
    if (successCount > 0) toast.success(`${successCount} PDF(s) traité(s) avec succès`);
    if (errorCount > 0) toast.error(`${errorCount} échec(s)`);
  };

  const clearAll = () => setItems([]);

  return (
    <div>
      <PageHeader
        title="Upload PDF"
        subtitle="Importez un ou plusieurs Journaux Hippiques PMU'B. Le LLM extraira automatiquement les données."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'card border-2 border-dashed flex flex-col items-center justify-center py-14 text-center transition-colors cursor-pointer',
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <UploadCloud size={36} className="text-accent mb-3" />
        <p className="text-fg font-medium">Déposez vos PDF ici ou cliquez pour parcourir</p>
        <p className="text-sm text-fg-muted mt-1">Plusieurs fichiers acceptés · jusqu'à 50 Mo / fichier</p>
        <input
          id="file-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fg">
              {items.length} fichier{items.length > 1 ? 's' : ''}
            </h2>
            <div className="flex gap-2">
              <button onClick={clearAll} disabled={uploading} className="btn-ghost">
                Vider la liste
              </button>
              <button onClick={startUpload} disabled={uploading} className="btn-primary">
                {uploading ? <Spinner /> : <UploadCloud size={16} />}
                {uploading ? 'Upload en cours…' : 'Démarrer l’upload'}
              </button>
            </div>
          </div>
          <div className="card divide-y divide-border">
            {items.map((it, idx) => (
              <div key={idx} className="p-4 flex items-center gap-3">
                <FileText size={20} className="text-fg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{it.file.name}</p>
                  <p className="text-xs text-fg-subtle">{(it.file.size / 1024).toFixed(1)} Ko</p>
                  {it.status === 'uploading' && (
                    <div className="mt-2 h-1 bg-bg-elevated rounded overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${it.progress}%` }}
                      />
                    </div>
                  )}
                  {it.error && (
                    <p className="text-xs text-danger mt-1 break-words">{it.error}</p>
                  )}
                  {it.raceId && (
                    <p className="text-xs text-fg-subtle mt-1 font-mono">{it.raceId}</p>
                  )}
                  {it.summary?.parse_quality && (
                    <ValidationSummary summary={it.summary} />
                  )}
                </div>
                <div className="shrink-0">
                  {it.status === 'pending' && (
                    <span className="badge bg-bg-elevated text-fg-muted">En attente</span>
                  )}
                  {it.status === 'uploading' && (
                    <span className="badge bg-accent/15 text-accent">{it.progress}%</span>
                  )}
                  {it.status === 'success' && (
                    <span className="badge bg-success/15 text-success">
                      <CheckCircle2 size={12} /> Réussi
                    </span>
                  )}
                  {it.status === 'error' && (
                    <span className="badge bg-danger/15 text-danger">
                      <AlertTriangle size={12} /> Échec
                    </span>
                  )}
                </div>
                {!uploading && it.status !== 'success' && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-fg-subtle hover:text-fg"
                    title="Retirer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationSummary({ summary }: { summary: NonNullable<FileItem['summary']> }) {
  const quality = summary.parse_quality;
  if (!quality) return null;

  const checks = [
    {
      label: 'Chevaux',
      ok:
        quality.doc_type === 'result' ||
        !quality.expected_runners ||
        quality.horses_count === quality.expected_runners,
      value: quality.expected_runners
        ? `${quality.horses_count}/${quality.expected_runners}`
        : `${quality.horses_count}`,
    },
    {
      label: 'Pronostics',
      ok: quality.doc_type === 'result' || quality.has_predictions,
      value: quality.has_predictions ? `${quality.predictions_count}` : 'Non',
    },
    {
      label: 'Rapports',
      ok: quality.has_previous_results,
      value: quality.has_previous_results ? 'Oui' : 'Non',
    },
    {
      label: 'Arret des jeux',
      ok: quality.has_betting_info || quality.doc_type === 'result',
      value: quality.has_betting_info ? 'Oui' : 'Non',
    },
  ];

  return (
    <div className="mt-3 rounded-md border border-border bg-bg-elevated/60 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs font-semibold text-fg">
          Validation: {summary.name || 'Course'} {summary.date ? `- ${summary.date}` : ''}
        </p>
        <span className="badge bg-bg text-fg-muted">
          {quality.doc_type === 'result' ? 'Resultat' : 'Programme'}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((check) => (
          <div key={check.label} className="rounded border border-border bg-bg-surface px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              {check.ok ? (
                <CheckCircle2 size={13} className="text-success" />
              ) : (
                <AlertTriangle size={13} className="text-warning" />
              )}
              <span className="text-[11px] font-medium text-fg-muted">{check.label}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-fg">{check.value}</p>
          </div>
        ))}
      </div>
      {quality.warnings.length > 0 && (
        <div className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1.5">
          <p className="text-[11px] font-semibold text-warning">Points a verifier</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {quality.warnings.map((warning, idx) => (
              <li key={idx} className="text-xs text-fg-muted">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
