import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, Copy, Check } from 'lucide-react';
import { liveService } from '@/api/live-service';
import { LiveIniciarResponse } from '@/types';

export default function CreateLivePage() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveIniciarResponse | null>(null);
  const [copied, setCopied] = useState('');

  const handleCreate = useCallback(async () => {
    if (!titulo.trim()) return;
    setLoading(true);
    try {
      const res = await liveService.iniciar({ titulo: titulo.trim(), descricao, source: 'whip' });
      setResult(res);
    } catch {} finally { setLoading(false); }
  }, [titulo, descricao]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">Live Criada!</h1>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-sm text-green-700">{result.mensagem}</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-500">URL RTMP (OBS/FFmpeg)</label>
              <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <code className="flex-1 text-xs break-all">{result.rtmp_url}</code>
                <button onClick={() => copyToClipboard(result.rtmp_url, 'rtmp')} className="text-neutral-400 hover:text-brand-red">
                  {copied === 'rtmp' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">URL HLS (Visualização)</label>
              <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <code className="flex-1 text-xs break-all">{result.hls_url}</code>
                <button onClick={() => copyToClipboard(result.hls_url, 'hls')} className="text-neutral-400 hover:text-brand-red">
                  {copied === 'hls' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/live/${result.id}/stream`)} className="flex-1 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark">
              Iniciar transmissão
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold flex items-center gap-2"><Radio className="w-5 h-5 text-red-500" /> Criar Live</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da live"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Descrição da live..."
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
        </div>
        <button onClick={handleCreate} disabled={loading || !titulo.trim()}
          className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
          {loading ? 'A criar...' : 'Criar Live'}
        </button>
      </div>
    </div>
  );
}