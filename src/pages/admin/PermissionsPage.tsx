import { useEffect, useState, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { adminService } from '@/api/admin-service';
import { RoleOut, PermissaoOut } from '@/types';

export default function AdminPermissions() {
  const [roles, setRoles] = useState<RoleOut[]>([]);
  const [allPerms, setAllPerms] = useState<PermissaoOut[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([adminService.getPapeis(), adminService.getPermissoes()])
      .then(async ([r, p]) => {
        setRoles(r); setAllPerms(p);
        if (r.length > 0) setSelectedRole(r[0].id);
        const byRole: Record<string, Set<string>> = {};
        await Promise.all(r.map(async (role) => {
          try { const rp = await adminService.getPermissoesDoPapel(role.id); byRole[role.id] = new Set(rp.map((x) => x.id)); } catch { byRole[role.id] = new Set(); }
        }));
        setRolePerms(byRole);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((permId: string) => {
    if (!selectedRole) return;
    setRolePerms((prev) => {
      const current = new Set(prev[selectedRole] ?? []);
      current.has(permId) ? current.delete(permId) : current.add(permId);
      return { ...prev, [selectedRole]: current };
    });
  }, [selectedRole]);

  const handleSave = useCallback(async () => {
    if (!selectedRole) return;
    setSaving(true);
    try { await adminService.atribuirPermissoes(selectedRole, Array.from(rolePerms[selectedRole] ?? [])); } catch {} finally { setSaving(false); }
  }, [selectedRole, rolePerms]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  const currentPerms = rolePerms[selectedRole] ?? new Set<string>();
  const grouped = allPerms.reduce<Record<string, PermissaoOut[]>>((acc, p) => { if (!acc[p.recurso]) acc[p.recurso] = []; acc[p.recurso].push(p); return acc; }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Settings className="w-6 h-6" /> Permissões</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border ${selectedRole === r.id ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {r.nome.charAt(0).toUpperCase() + r.nome.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([recurso, perms]) => (
          <div key={recurso}>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{recurso}</h3>
            <div className="space-y-2">
              {perms.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">{perm.acao}</p>
                    <p className="text-xs text-neutral-500">{perm.recurso} → {perm.acao}</p>
                  </div>
                  <button onClick={() => toggle(perm.id)}
                    className={`w-10 h-6 rounded-full transition-colors ${currentPerms.has(perm.id) ? 'bg-brand-red' : 'bg-neutral-300 dark:bg-neutral-600'} relative`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${currentPerms.has(perm.id) ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="mt-6 w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
        {saving ? 'A guardar...' : 'Guardar Alterações'}
      </button>
    </div>
  );
}