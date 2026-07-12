import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Heart, Radio } from 'lucide-react';
import { catalogService } from '@/api/catalog-service';
import { liveService } from '@/api/live-service';
import { interactionService } from '@/api/interaction-service';
import { CurtaOut, LiveOut, Categoria } from '@/types';
import { mediaUrl } from '@/api/http-client';
import { useAuthStore } from '@/stores/auth-store';

function FeaturedCarousel({ films }: { films: CurtaOut[] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % films.length);
  }, [films.length]);

  useEffect(() => {
    if (films.length <= 1) return;
    timerRef.current = setInterval(advance, 4000);
    return () => clearInterval(timerRef.current);
  }, [active, advance, films.length]);

  if (films.length === 0) return null;

  return (
    <section className="relative w-full max-w-7xl mx-auto mb-8">
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(300px, 55vh, 600px)' }}>
        {films.map((film, i) => {
          const capa = mediaUrl(film.media_assets?.find((a) => a.tipo === 'thumbnail')?.path_comprimido ?? film.capa_importada_path ?? film.capa_path);
          return (
            <Link
              key={film.id}
              to={`/filme/${film.id}`}
              className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              {capa ? (
                <img src={capa} alt={film.titulo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <Play className="w-20 h-20 text-neutral-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
                <span className="inline-block px-3 py-1 bg-brand-red text-white text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                  Em destaque
                </span>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 line-clamp-2">{film.titulo}</h2>
                <p className="text-sm text-white/70">
                  {new Date(film.criado_em).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {films.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {films.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); clearInterval(timerRef.current); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? 'w-5 bg-brand-red' : 'w-2 bg-neutral-400 dark:bg-neutral-600'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function formatViews(n: number): string {
  const v = Math.round(n / 2);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function FilmCard({ film, isFavorite, onToggleFavorite }: { film: CurtaOut; isFavorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const capa = mediaUrl(film.media_assets?.find((a) => a.tipo === 'thumbnail')?.path_comprimido ?? film.capa_path);
  return (
    <Link to={`/filme/${film.id}`} className="group block relative">
      <div className="aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
        {capa ? (
          <img src={capa} alt={film.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-neutral-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-12 h-12 rounded-full bg-brand-red/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(film.id); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors z-10"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'text-brand-red fill-brand-red' : 'text-white'}`} />
          </button>
        )}
      </div>
      <div className="mt-2 px-1">
        <h3 className="font-semibold text-sm truncate group-hover:text-brand-red transition-colors">{film.titulo}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatViews(film.visualizacoes)}</span>
        </div>
      </div>
    </Link>
  );
}

interface CategorySection {
  categoria: Categoria;
  films: CurtaOut[];
}

export default function HomePage() {
  const [destaques, setDestaques] = useState<CurtaOut[]>([]);
  const [populares, setPopulares] = useState<CurtaOut[]>([]);
  const [lives, setLives] = useState<LiveOut[]>([]);
  const [categorySections, setCategorySections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const toggleFavorite = useCallback(async (filmId: string) => {
    if (!isAuthenticated) return;
    const wasFavorited = favoritedIds.has(filmId);
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      wasFavorited ? next.delete(filmId) : next.add(filmId);
      return next;
    });
    try {
      wasFavorited
        ? await interactionService.removeFavorite(filmId)
        : await interactionService.toggleFavorite(filmId);
    } catch {
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        wasFavorited ? next.add(filmId) : next.delete(filmId);
        return next;
      });
    }
  }, [favoritedIds, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    interactionService.getFavoritos()
      .then((favs) => setFavoritedIds(new Set(favs.map((f) => f.curta_id))))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    Promise.all([
      catalogService.getFeed().catch(() => ({ destaques: [], populares: [] })),
      liveService.listarAtivas().catch(() => []),
      catalogService.getCategories().catch(() => []),
    ]).then(([feed, liveList, cats]) => {
      setDestaques(feed.destaques ?? []);
      setPopulares(feed.populares ?? []);
      setLives(liveList ?? []);

      if (cats.length > 0) {
        Promise.all(
          cats.map((cat) =>
            catalogService.getFilms({ categoriaId: cat.id, limit: 5 })
              .then((res) => ({ categoria: cat, films: res.data }))
              .catch(() => ({ categoria: cat, films: [] as CurtaOut[] }))
          )
        ).then((sections) => {
          setCategorySections(
            sections.filter((s) => s.films.length >= 3)
          );
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Carousel */}
      <FeaturedCarousel films={destaques} />

      {/* Destaques */}
      {destaques.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Destaques</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {destaques.slice(0, 5).map((film) => (
              <div key={film.id} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(20%-13px)]">
                <FilmCard film={film} isFavorite={favoritedIds.has(film.id)} onToggleFavorite={toggleFavorite} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lives */}
      {lives.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" /> A ao vivo
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {lives.map((live) => (
              <Link
                key={live.id}
                to={`/live/${live.id}`}
                className="flex-shrink-0 w-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-xs font-semibold text-red-500 uppercase">AO VIVO</span>
                </div>
                <h3 className="font-semibold text-sm truncate">{live.titulo}</h3>
                <p className="text-xs text-neutral-500 mt-1">{live.criador_nome}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Populares */}
      {populares.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Populares</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {populares.map((film) => (
              <div key={film.id} className="w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)]">
                <FilmCard film={film} isFavorite={favoritedIds.has(film.id)} onToggleFavorite={toggleFavorite} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categorias */}
      {categorySections.map((section) => (
        <section key={section.categoria.id}>
          <h2 className="text-xl font-bold mb-4">{section.categoria.nome}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {section.films.slice(0, 5).map((film) => (
              <div key={film.id} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(20%-13px)]">
                <FilmCard film={film} isFavorite={favoritedIds.has(film.id)} onToggleFavorite={toggleFavorite} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {destaques.length === 0 && populares.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-neutral-500">
          <Play className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum filme disponível</p>
          <p className="text-sm">Volte mais tarde para descobrir novos curtas-metragens.</p>
        </div>
      )}
    </div>
  );
}
