import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, Eye, Trash2 } from 'lucide-react';
import { interactionService } from '@/api/interaction-service';
import { catalogService } from '@/api/catalog-service';
import { CurtaOut, FavoritoOut } from '@/types';
import { mediaUrl } from '@/api/http-client';

function formatViews(n: number): string {
  const v = Math.round(n / 2);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritoOut[]>([]);
  const [films, setFilms] = useState<CurtaOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interactionService.getFavoritos()
      .then(async (favs) => {
        setFavorites(favs);
        const filmPromises = favs.map((f) => catalogService.getFilm(f.curta_id).catch(() => null));
        const filmResults = await Promise.all(filmPromises);
        setFilms(filmResults.filter(Boolean) as CurtaOut[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (curtaId: string) => {
    try {
      await interactionService.removeFavorite(curtaId);
      setFavorites((prev) => prev.filter((f) => f.curta_id !== curtaId));
      setFilms((prev) => prev.filter((f) => f.id !== curtaId));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6 text-brand-red" /> Favoritos
      </h1>

      {films.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-neutral-500">
          <Heart className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">Sem favoritos</p>
          <p className="text-sm">Adicione filmes aos favoritos para os ver aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {films.map((film) => {
            const capa = mediaUrl(film.media_assets?.find((a) => a.tipo === 'thumbnail')?.path_comprimido ?? film.capa_path);
            return (
              <div key={film.id} className="group">
                <Link to={`/filme/${film.id}`} className="block">
                  <div className="aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
                    {capa ? (
                      <img src={capa} alt={film.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Play className="w-10 h-10 text-neutral-400" /></div>
                    )}
                  </div>
                  <div className="mt-2 px-1">
                    <h3 className="font-semibold text-sm truncate group-hover:text-brand-red transition-colors">{film.titulo}</h3>
                    <span className="flex items-center gap-1 text-xs text-neutral-500 mt-1"><Eye className="w-3 h-3" /> {formatViews(film.visualizacoes)}</span>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(film.id)}
                  className="mt-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
