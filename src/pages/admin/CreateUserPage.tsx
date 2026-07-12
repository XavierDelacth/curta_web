import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { adminService } from '@/api/admin-service';
import { RoleOut } from '@/types';

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [roleId, setRoleId] = useState('');
  const [papeis, setPapeis] = useState<RoleOut[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminService.getPapeis().then((list) => {
      const filtered = list.filter((p) => ['utilizador', 'administrador'].includes(p.nome));
      setPapeis(filtered);
      const def = filtered.find((p) => p.nome === 'utilizador');
      if (def) setRoleId(def.id);
    }).catch(() => {});
  }, []);

  const handleSubmit = useCallback(async () => {
    const errs: Record<string, string> = {};
    if (nome.trim().length < 2) errs.nome = 'Nome inválido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (senha.length < 8) errs.senha = 'Mínimo 8 caracteres';
    if (senha !== confirmar) errs.confirmar = 'Passwords não coincidem';
    if (!roleId) errs.role = 'Selecione um papel';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      await adminService.createUser({ nome: nome.trim(), email: email.trim().toLowerCase(), senha, role_id: roleId });
      navigate('/admin/utilizadores');
    } catch { setErrors({ email: 'E-mail já registado.' }); } finally { setLoading(false); }
  }, [nome, email, senha, confirmar, roleId, navigate]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> Criar Utilizador</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Palavra-passe</label>
          <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirmar</label>
          <input value={confirmar} onChange={(e) => setConfirmar(e.target.value)} type="password"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          {errors.confirmar && <p className="text-xs text-red-500 mt-1">{errors.confirmar}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Papel</label>
          <div className="flex gap-2">
            {papeis.map((p) => (
              <button key={p.id} onClick={() => setRoleId(p.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${roleId === p.id ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
                {p.nome.charAt(0).toUpperCase() + p.nome.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
          {loading ? 'A criar...' : 'Criar Utilizador'}
        </button>
      </div>
    </div>
  );
}