import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Database, DownloadCloud, FileText, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const actions = [
  {
    to: '/analysis/upload',
    label: 'Upload PDF',
    detail: 'Importer un programme, un resultat ou un document historique.',
    icon: FileText,
  },
  {
    to: '/analysis/archive-import',
    label: 'Import LONAB',
    detail: 'Previsualiser et importer des archives PDF LONAB.',
    icon: DownloadCloud,
  },
  {
    to: '/analysis/races',
    label: 'Corpus courses',
    detail: 'Controler les documents analyses et leurs liens programme/resultat.',
    icon: Database,
  },
  {
    to: '/analysis/logs',
    label: 'Activite',
    detail: 'Suivre les actions admin et les imports recents.',
    icon: Activity,
  },
];

export default function AnalysisDashboard() {
  return (
    <div>
      <PageHeader
        title="PMU'B/LONAB/Analysis"
        subtitle="Espace admin pour la recherche historique et les imports PDF."
      />

      <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
            <Search size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">Priorite de ce produit</h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">
              Transformer les PDF PMU'B/LONAB en donnees recherchables, comparables et auditables,
              sans conseil direct de pari.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="card group flex items-start gap-4 p-5 transition-colors hover:border-border-strong hover:bg-bg-elevated/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated text-accent">
              <action.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">{action.label}</h3>
                <ArrowUpRight size={13} className="text-fg-subtle group-hover:text-fg" />
              </div>
              <p className="mt-1 text-sm text-fg-muted">{action.detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
