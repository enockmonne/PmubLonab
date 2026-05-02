import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Auth, apiError } from '@/lib/api';
import { setToken, setUser, isAuthenticated } from '@/lib/auth';
import Spinner from '@/components/Spinner';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      const { data } = await Auth.login(email.trim().toLowerCase(), password);
      setToken(data.token);
      setUser(data.user);
      toast.success(`Bienvenue, ${data.user.email}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-lg bg-accent items-center justify-center text-white font-bold text-xl mb-4">
            H
          </div>
          <h1 className="text-2xl font-semibold text-fg">PMU'B Admin</h1>
          <p className="text-sm text-fg-muted mt-1">
            Connectez-vous pour accéder au tableau de bord
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="admin@pmub.app"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-9"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner /> : <LogIn size={16} />}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-fg-subtle mt-6">
          Le Journal Hippique PMU'B · Admin Web v1.0
        </p>
      </div>
    </div>
  );
}
