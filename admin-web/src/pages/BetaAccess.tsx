import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, RefreshCw, Smartphone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { Admin, apiError, BetaAccessCodeUsage, BetaAccessDeviceUsage } from '@/lib/api';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function shortDevice(value?: string) {
  if (!value) return '—';
  if (value.length <= 22) return value;
  return `${value.slice(0, 14)}…${value.slice(-6)}`;
}

export default function BetaAccess() {
  const [codes, setCodes] = useState<BetaAccessCodeUsage[]>([]);
  const [devices, setDevices] = useState<BetaAccessDeviceUsage[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [configuredCount, setConfiguredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await Admin.betaAccessUsage();
      setCodes(data.codes || []);
      setDevices(data.devices || []);
      setEnabled(data.enabled);
      setConfiguredCount(data.configured_codes_count || 0);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const suspiciousCount = useMemo(
    () => codes.filter((code) => code.suspicious).length,
    [codes]
  );

  return (
    <div>
      <PageHeader
        title="Accès beta"
        subtitle="Suivez les codes utilisés, les appareils associés et les signes de partage."
      />

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon={<KeyRound size={16} />}
          label="Codes configurés"
          value={configuredCount}
          hint={enabled ? 'Gate actif côté backend' : 'Aucun code backend configuré'}
        />
        <SummaryCard
          icon={<Smartphone size={16} />}
          label="Appareils vus"
          value={devices.length}
          hint="Appareils anonymes ayant validé un code"
        />
        <SummaryCard
          icon={<AlertTriangle size={16} />}
          label="Codes à surveiller"
          value={suspiciousCount}
          hint="Signalé dès qu'un code apparaît sur plus d'un appareil"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">Codes</h2>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-fg-muted hover:bg-bg-elevated"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-border bg-bg-surface mb-6">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-xs uppercase tracking-wider text-fg-muted">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Appareils</th>
                  <th className="text-left px-4 py-3">Utilisations</th>
                  <th className="text-left px-4 py-3">Première utilisation</th>
                  <th className="text-left px-4 py-3">Dernière utilisation</th>
                  <th className="text-left px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {codes.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-fg-muted" colSpan={6}>
                      Aucun code ou usage enregistré.
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.code}>
                      <td className="px-4 py-3 font-mono font-semibold text-fg">{code.code}</td>
                      <td className="px-4 py-3 text-fg">{code.device_count}</td>
                      <td className="px-4 py-3 text-fg">{code.total_uses}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(code.first_seen_at)}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(code.last_seen_at)}</td>
                      <td className="px-4 py-3">
                        {code.suspicious ? (
                          <span className="rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">
                            À vérifier
                          </span>
                        ) : (
                          <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-sm font-semibold text-fg uppercase tracking-wider mb-3">Appareils</h2>
          <div className="overflow-hidden rounded-md border border-border bg-bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-xs uppercase tracking-wider text-fg-muted">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Appareil</th>
                  <th className="text-left px-4 py-3">Plateforme</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">Dernière activité</th>
                  <th className="text-left px-4 py-3">Usages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {devices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-fg-muted" colSpan={6}>
                      Aucun appareil enregistré.
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={`${device.code}-${device.device_id}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-fg">{device.code}</td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted" title={device.device_id}>
                        {shortDevice(device.device_id)}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{device.platform || '—'}</td>
                      <td className="px-4 py-3 text-fg-muted">{device.ip || '—'}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(device.last_seen_at)}</td>
                      <td className="px-4 py-3 text-fg">{device.use_count || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="bg-bg-surface border border-border rounded-md p-4">
      <div className="flex items-center gap-2 text-fg-muted text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </div>
  );
}
