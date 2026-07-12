import { ShieldOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  if (!user || !role || !allowedRoles.includes(role as UserRole)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <ShieldOff className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p className="text-neutral-500 text-center max-w-md">
          Não tem permissão para aceder a esta área.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function useIsAdmin() {
  const role = useAuthStore((s) => s.role);
  return role === 'administrador';
}
