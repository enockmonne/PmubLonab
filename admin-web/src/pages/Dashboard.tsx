import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  FileText,
  Award,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Admin, DashboardStats, apiError } from '@/lib/api';
import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import { CenteredSpinner } from '@/components/Spinner';
import { formatDate, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await Admin.status();
        setData(res.data);
      } catch (err) {
        toast.error(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <CenteredSpinner label="Chargement du tableau de bord…" />;
  if (!data) return <div className="text-fg-muted">Aucune donnée</div>;

  const llmOk = data.llm.status === 'ok';

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Connecté en tant que ${data.admin.email}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total courses" value={data.stats.total_races} icon={Trophy} />
        <StatCard label="Programmes" value={data.stats.programmes} icon={FileText} />
        <StatCard label="Résultats" value={data.stats.results} icon={Award} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Course active */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">
              Course active
            </h2>
            <Link to="/races" className="text-xs text-accent hover:underline flex items-center gap-1">
              Gérer <ArrowUpRight size={12} />
            </Link>
          </div>
          {data.current_race ? (
            <div>
              <p className="text-lg font-semibold text-fg">{data.current_race.name}</p>
              <p className="text-sm text-fg-muted mt-1">
                {data.current_race.location} · {data.current_race.date_text}
              </p>
              <p className="text-xs text-fg-subtle mt-2 font-mono">{data.current_race.race_id}</p>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Aucune course active</p>
          )}
        </div>

        {/* Dernier upload */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">
              Dernier upload
            </h2>
            <Link to="/upload" className="text-xs text-accent hover:underline flex items-center gap-1">
              Uploader <ArrowUpRight size={12} />
            </Link>
          </div>
          {data.last_upload ? (
            <div>
              <p className="text-base font-semibold text-fg">{data.last_upload.name}</p>
              <p className="text-sm text-fg-muted mt-1 capitalize">
                {data.last_upload.doc_type} · {data.last_upload.date_text}
              </p>
              <p className="text-xs text-fg-subtle mt-2">
                {formatRelative(data.last_upload.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Aucun upload récent</p>
          )}
        </div>

        {/* LLM Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">
              État LLM (Gemini)
            </h2>
            <Activity size={14} className="text-fg-subtle" />
          </div>
          <div
            className={`flex items-center gap-2 ${llmOk ? 'text-success' : 'text-danger'}`}
          >
            {llmOk ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="font-medium">
              {llmOk ? 'Opérationnel' : data.llm.status === 'error' ? 'Erreur' : 'Inconnu'}
            </span>
          </div>
          {data.llm.error && (
            <p className="text-xs text-danger/80 mt-2 font-mono break-all">{data.llm.error}</p>
          )}
        </div>

        {/* Compte admin */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">
              Mon compte
            </h2>
          </div>
          <p className="text-base font-medium text-fg">{data.admin.email}</p>
          <p className="text-xs text-fg-muted mt-1 uppercase tracking-wider">
            Rôle · {data.admin.role}
          </p>
          <p className="text-xs text-fg-subtle mt-3">
            Dernière connexion : {formatDate(data.admin.last_login_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
