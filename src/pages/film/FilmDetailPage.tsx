import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Eye, Calendar, ThumbsUp, ThumbsDown, Heart, Download, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { catalogService } from '@/api/catalog-service';
import { interactionService } from '@/api/interaction-service';
import { downloadService } from '@/api/download-service';
import { mediaUrl } from '@/api/http-client';
import { useAuthStore } from '@/stores/auth-store';
import { AvaliacaoSummary, ComentarioOut, CurtaOut } from '@/types';

function formatCount(n: number): string {
  const v = Math.round(n / 2);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} anos`;
}

export default function FilmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [film, setFilm] = useState<CurtaOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [summary, setSummary] = useState<AvaliacaoSummary | null>(null);
  const [comments, setComments] = useState<ComentarioOut[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      catalogService.getFilm(id),
      interactionService.getAvaliacaoSummary(id).catch(() => null),
      interactionService.getComments(id).catch(() => []),
      catalogService.getCategories().then((cats) => {
        const map: Record<string, string> = {};
        cats.forEach((c) => { map[c.id] = c.nome; });
        return map;
      }).catch(() => ({})),
      interactionService.getFavoritos().catch(() => []),
    ]).then(([f, aval, comms, cats, favs]) => {
      setFilm(f);
      setSummary(aval);
      setComments(comms ?? []);
      setCategorias(cats);
      setIsFavorited(favs.some((fav) => fav.curta_id === id));
      if (aval) {
        setIsLiked(aval.avaliacao_utilizador === 'gosto');
        setIsDisliked(aval.avaliacao_utilizador === 'nao_gosto');
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleLike = useCallback(async () => {
    if (!id) return;
    await interactionService.toggleLike(id);
    const s = await interactionService.getAvaliacaoSummary(id);
    setSummary(s);
    setIsLiked(s.avaliacao_utilizador === 'gosto');
    setIsDisliked(s.avaliacao_utilizador === 'nao_gosto');
  }, [id]);

  const handleDislike = useCallback(async () => {
    if (!id) return;
    await interactionService.toggleDislike(id);
    const s = await interactionService.getAvaliacaoSummary(id);
    setSummary(s);
    setIsLiked(s.avaliacao_utilizador === 'gosto');
    setIsDisliked(s.avaliacao_utilizador === 'nao_gosto');
  }, [id]);

  const handleFavorite = useCallback(async () => {
    if (!id) return;
    if (isFavorited) await interactionService.removeFavorite(id);
    else await interactionService.toggleFavorite(id);
    setIsFavorited(!isFavorited);
  }, [id, isFavorited]);

  const handleDownload = useCallback(async () => {
    if (!film || dlProgress !== null) return;
    setDlProgress(0);
    try {
      await downloadService.downloadAndSave(film.id, film.titulo);
      await downloadService.registerDownload(film.id).catch(() => {});
      setDlProgress(null);
    } catch { setDlProgress(null); }
  }, [film, dlProgress]);

  const handleComment = useCallback(async () => {
    if (!id || !commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await interactionService.addComment(id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {} finally { setSubmitting(false); }
  }, [id, commentText, submitting]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!id) return;
    await interactionService.deleteComment(id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
      </div>
    );
  }

  if (!film) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-500">
        <p>Filme não encontrado.</p>
        <button onClick={() => navigate('/')} className="mt-2 text-brand-red font-medium hover:underline">Voltar ao início</button>
      </div>
    );
  }

  const capa = mediaUrl(film.media_assets?.find((a) => a.tipo === 'thumbnail')?.path_comprimido ?? film.capa_path);
  const likeCount = summary?.total_gostos ?? 0;
  const dislikeCount = summary?.total_nao_gostos ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold truncate flex-1">Detalhe</h1>
      </div>

      {/* Thumbnail */}
      <Link to={`/filme/${film.id}/player`} className="block aspect-video rounded-xl overflow-hidden bg-black relative group">
        {capa ? (
          <img src={capa} alt={film.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Play className="w-16 h-16 text-neutral-400" /></div>
        )}
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 rounded-full bg-brand-red/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </Link>

      <div className="mt-4 space-y-4">
        <h2 className="text-xl font-bold">{film.titulo}</h2>

        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {formatCount(film.visualizacoes)} views</span>
          {film.publicado_em && (
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {timeAgo(film.publicado_em)}</span>
          )}
        </div>

        {film.categoria_id && categorias[film.categoria_id] && (
          <span className="inline-block px-3 py-1 bg-brand-red text-white text-xs font-semibold rounded-full">
            {categorias[film.categoria_id]}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 border-y border-neutral-200 dark:border-neutral-700 py-2">
          <button onClick={handleLike} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${isLiked ? 'text-brand-red' : 'text-neutral-500'}`}>
            <ThumbsUp className="w-5 h-5" />
            <span className="text-xs font-medium">{formatCount(likeCount)}</span>
          </button>
          <button onClick={handleDislike} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${isDisliked ? 'text-red-500' : 'text-neutral-500'}`}>
            <ThumbsDown className="w-5 h-5" />
            <span className="text-xs font-medium">{formatCount(dislikeCount)}</span>
          </button>
          <button onClick={handleFavorite} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${isFavorited ? 'text-brand-red' : 'text-neutral-500'}`}>
            <Heart className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} />
            <span className="text-xs font-medium">{isFavorited ? 'Guardado' : 'Favorito'}</span>
          </button>
          <button onClick={handleDownload} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500">
            <Download className="w-5 h-5" />
            <span className="text-xs font-medium">Descarregar</span>
          </button>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-bold mb-2">Sinopse</h3>
          <p className={`text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
            {film.descricao}
          </p>
          <button onClick={() => setShowFullDesc(!showFullDesc)} className="flex items-center gap-1 text-sm text-brand-red font-medium mt-1">
            {showFullDesc ? 'Ver menos' : 'Ver mais'}
            {showFullDesc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Comments */}
        <div>
          <h3 className="font-bold mb-3">Comentários ({comments.length})</h3>

          {user && (
            <div className="flex items-center gap-2 mb-4 p-3 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicionar um comentário..."
                className="flex-1 bg-transparent outline-none text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                maxLength={500}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || submitting}
                className="text-brand-red disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-neutral-500">
                    {(user?.id === c.utilizador_id ? user?.nome?.charAt(0) : c.utilizador_id.charAt(0)).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{user?.id === c.utilizador_id ? 'Tu' : `@${c.utilizador_id.slice(0, 6)}`}</span>
                    <span className="text-xs text-neutral-400">{timeAgo(c.criado_em)}</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{c.conteudo}</p>
                </div>
                {user?.id === c.utilizador_id && (
                  <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
