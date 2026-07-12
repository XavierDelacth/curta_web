import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { HttpError } from '@/api/http-client';

const UTILIZADOR_ROLE_ID = '30c70b7d-da4a-4bb9-bd18-a431906d2c76';

function getPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 'weak';
  if (score <= 2) return 'medium';
  return 'strong';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const strengthColor = strength === 'weak' ? 'bg-red-500' : strength === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
  const strengthWidth = strength === 'weak' ? '25%' : strength === 'medium' ? '60%' : '100%';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) errs.nome = 'Nome deve ter pelo menos 2 caracteres';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (!password || password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (password !== confirm) errs.confirm = 'As palavras-passe não coincidem';
    if (!accepted) { setFormError('Deve aceitar os Termos de Uso.'); return; }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError('');
    setLoading(true);
    try {
      await register(nome.trim(), email.trim().toLowerCase(), password, UTILIZADOR_ROLE_ID);
      navigate('/');
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setErrors({ email: 'Este e-mail já está registado.' });
      } else {
        setFormError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 py-8">
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
              <h1 className="text-2xl font-bold">Criar conta</h1>
              <p className="text-sm text-neutral-500">Junta-te à comunidade Curta</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErrors((p) => ({ ...p, nome: '' })); }}
                placeholder="O teu nome"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
              />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                placeholder="o.teu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Palavra-passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
              />
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColor}`} style={{ width: strengthWidth }} />
                  </div>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmar palavra-passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: '' })); }}
                placeholder="Repete a palavra-passe"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
              />
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
            </div>

            <button type="button" onClick={() => setAccepted((v) => !v)} className="flex items-center gap-3 cursor-pointer w-full text-left">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${accepted ? 'bg-brand-red border-brand-red' : 'border-neutral-300 dark:border-neutral-600'}`}>
                {accepted && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-neutral-500">
                Aceito os <span className="text-brand-red font-semibold">Termos de Uso</span>
              </span>
            </button>

            {formError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nome || !email || !password || !confirm || !accepted || strength === 'weak'}
              className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'A criar conta...' : 'Criar Conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Já tens conta?{' '}
            <Link to="/login" className="text-brand-red font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
