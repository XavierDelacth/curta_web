import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { catalogService } from '@/api/catalog-service';
import { uploadService } from '@/api/upload-service';
import { useAuthStore } from '@/stores/auth-store';
import { Categoria, TagOut, CurtaOut } from '@/types';

export default function FilmEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [film, setFilm] = useState<CurtaOut | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [tags, setTags] = useState<TagOut[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      catalogService.getFilm(id),
      catalogService.getCategories(),
      catalogService.getTags().catch(() => []),
    ]).then(([f, cats, tagList]) => {
      setFilm(f);
      setTitulo(f.titulo);
      setDescricao(f.descricao);
      setCategoriaId(f.categoria_id);
      setCategories(cats);
      setTags(tagList);
    }).catch(() => navigate('/')).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = useCallback(async () => {
    if (!id || !titulo.trim()) return;
    setSaving(true);
    try {
      await uploadService.updateFilm(id, { titulo: titulo.trim(), descricao, categoriaId, tagIds: selectedTags });
      navigate(`/filme/${id}`);
    } catch {} finally { setSaving(false); }
  }, [id, titulo, descricao, categoriaId, selectedTags, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    try {
      await uploadService.deleteFilm(id);
      navigate('/');
    } catch {} finally { setShowDelete(false); }
  }, [id, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Editar Filme</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-red/50 text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm">
            <option value="">Selecionar...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const sel = selectedTags.includes(tag.id);
                return (
                  <button key={tag.id}
                    onClick={() => setSelectedTags((prev) => sel ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sel ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400'}`}>
                    {tag.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} disabled={saving || !titulo.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'A guardar...' : 'Guardar'}
        </button>
        <button onClick={() => setShowDelete(true)}
          className="px-4 py-2.5 border border-red-300 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Eliminar filme?</h3>
            <p className="text-sm text-neutral-500 mb-4">Esta ação não pode ser revertida.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
