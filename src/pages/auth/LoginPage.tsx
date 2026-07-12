import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { HttpError } from '@/api/http-client';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.status === 403) setError('A sua conta está bloqueada.');
        else setError('E-mail ou palavra-passe incorretos.');
      } else {
        setError('Erro de ligação. Verifique a sua internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-red font-medium mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Entrar</h1>
              <p className="text-sm text-neutral-500">Bem-vindo de volta</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="o.teu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Palavra-passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-brand-red font-medium hover:underline">
                Esqueci a palavra-passe
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Não tens conta?{' '}
            <Link to="/register" className="text-brand-red font-semibold hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
