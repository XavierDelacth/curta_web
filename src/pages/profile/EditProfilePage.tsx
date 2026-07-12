import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { userService } from '@/api/user-service';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSaveProfile = useCallback(async () => {
    if (!user || !nome.trim()) return;
    setSaving(true);
    try {
      const updated = await userService.updateProfile(user.id, { nome: nome.trim(), email: email.trim() });
      updateUser(updated);
      setMsg('Perfil atualizado com sucesso.');
    } catch { setMsg('Erro ao atualizar perfil.'); } finally { setSaving(false); }
  }, [user, nome, email, updateUser]);

  const handleChangePassword = useCallback(async () => {
    if (!senhaAtual || !novaSenha || novaSenha.length < 8) return;
    setSaving(true);
    try {
      await userService.changePassword({ senha_atual: senhaAtual, nova_senha: novaSenha });
      setSenhaAtual(''); setNovaSenha('');
      setMsg('Palavra-passe alterada com sucesso.');
    } catch { setMsg('Erro ao alterar palavra-passe. Verifique a senha atual.'); } finally { setSaving(false); }
  }, [senhaAtual, novaSenha]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold">Editar Perfil</h1>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-sm mb-4 ${msg.includes('sucesso') ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200'}`}>
          {msg}
        </div>
      )}

      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase">Dados pessoais</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <button onClick={handleSaveProfile} disabled={saving || !nome.trim()}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase flex items-center gap-1"><Lock className="w-4 h-4" /> Alterar palavra-passe</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Palavra-passe atual</label>
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nova palavra-passe</label>
          <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 8 caracteres"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <button onClick={handleChangePassword} disabled={saving || !senhaAtual || novaSenha.length < 8}
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-brand-red text-brand-red rounded-xl font-semibold hover:bg-brand-red/5 disabled:opacity-50">
          <Lock className="w-4 h-4" /> Alterar palavra-passe
        </button>
      </div>
    </div>
  );
}
