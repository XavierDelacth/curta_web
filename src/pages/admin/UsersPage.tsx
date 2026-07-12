import { useEffect, useState, useCallback } from 'react';
import { Users, Search, Shield, Ban, CheckCircle } from 'lucide-react';
import { adminService } from '@/api/admin-service';
import { UserOut, RoleOut } from '@/types';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [roles, setRoles] = useState<RoleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'bloqueado'>('todos');
  const [confirmTarget, setConfirmTarget] = useState<UserOut | null>(null);

  useEffect(() => {
    Promise.all([adminService.getUsers(), adminService.getPapeis()])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchQ = u.nome.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase());
    const matchS = filter === 'todos' || u.status === filter;
    return matchQ && matchS;
  });

  const getRoleName = (roleId: string) => roles.find((r) => r.id === roleId)?.nome ?? '';

  const handleToggle = useCallback(async () => {
    if (!confirmTarget) return;
    try {
      const isBlocked = confirmTarget.status === 'bloqueado';
      const updated = isBlocked ? await adminService.unblockUser(confirmTarget.id) : await adminService.blockUser(confirmTarget.id);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch {} finally { setConfirmTarget(null); }
  }, [confirmTarget]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Users className="w-6 h-6" /> Utilizadores</h1>

      <div className="flex items-center gap-2 mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        <Search className="w-5 h-5 text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar..."
          className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <div className="flex gap-2 mb-4">
        {(['todos', 'ativo', 'bloqueado'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {f === 'todos' ? 'Todos' : f === 'ativo' ? 'Ativos' : 'Bloqueados'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-brand-red">{u.nome.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{u.nome}</p>
              <p className="text-xs text-neutral-500">{u.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 border border-brand-red/30 text-brand-red rounded-full">{getRoleName(u.role_id)}</span>
                {u.status === 'bloqueado' && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Bloqueado</span>}
              </div>
            </div>
            <button onClick={() => setConfirmTarget(u)}
              className={`p-2 rounded-lg ${u.status === 'bloqueado' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
              {u.status === 'bloqueado' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">
              {confirmTarget.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'} utilizador?
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              {confirmTarget.status === 'bloqueado'
                ? `${confirmTarget.nome} voltará a ter acesso.`
                : `${confirmTarget.nome} deixará de conseguir autenticar-se.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmTarget(null)} className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleToggle} className="flex-1 py-2 bg-brand-red text-white rounded-xl text-sm font-semibold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}