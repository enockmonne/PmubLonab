import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Auth, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { getUser } from '@/lib/auth';
import Spinner from '@/components/Spinner';

export default function Settings() {
  const user = getUser();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSubmitting(true);
    try {
      await Auth.changePassword(oldPwd, newPwd);
      toast.success('Mot de passe modifié');
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Gérez votre compte administrateur" />

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wide mb-3">Compte</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-fg-muted text-xs uppercase tracking-wider">Email</dt>
            <dd className="text-fg mt-0.5">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-fg-muted text-xs uppercase tracking-wider">Rôle</dt>
            <dd className="text-fg mt-0.5 capitalize">{user?.role}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 max-w-md">
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wide mb-3 flex items-center gap-2">
          <KeyRound size={14} /> Changer le mot de passe
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">Mot de passe actuel</label>
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="input"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label">Confirmation</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="input"
              minLength={8}
              required
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Spinner /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
