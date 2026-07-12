import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  prompt?: string;
}

export function AuthGuard({ children, prompt }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <>{children}</>;

  if (!prompt) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
      <p className="flex-1 text-sm text-neutral-500">{prompt}</p>
      <Link
        to="/login"
        className="px-4 py-1.5 bg-brand-red text-white rounded-full text-sm font-semibold hover:bg-brand-red-dark transition-colors"
      >
        Entrar
      </Link>
    </div>
  );
}
