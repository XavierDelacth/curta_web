import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, Lightbulb } from 'lucide-react';
import { authService } from '@/api/auth-service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('E-mail inválido'); return; }
    setEmailError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
    } catch {} finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8">
            <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-brand-red" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Verifique o seu e-mail</h1>
            <p className="text-neutral-500 mb-6">
              Se existir uma conta com o endereço <span className="font-semibold text-neutral-900 dark:text-white">{email}</span>, receberá um e-mail com instruções para redefinir a sua palavra-passe.
            </p>
            <div className="flex items-start gap-2 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl text-sm text-neutral-500 text-left mb-6">
              <Lightbulb className="w-4 h-4 mt-0.5 text-brand-gold flex-shrink-0" />
              Não recebeu o e-mail? Verifique a pasta de spam ou aguarde alguns minutos.
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-brand-red font-semibold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-red font-medium mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Recuperar acesso</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Introduz o e-mail associado à tua conta e enviaremos instruções para criar uma nova palavra-passe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="o.teu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red text-sm"
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'A enviar...' : 'Enviar instruções'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-brand-red font-semibold hover:underline">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
