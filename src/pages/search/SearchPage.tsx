import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X, Play, Eye, SlidersHorizontal } from 'lucide-react';
import { catalogService, SearchParams } from '@/api/catalog-service';
import { CurtaOut, Categoria } from '@/types';
import { mediaUrl } from '@/api/http-client';

function formatViews(n: number): string {
  const v = Math.round(n / 2);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<SearchParams['sort']>('recentes');
  const [results, setResults] = useState<CurtaOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    catalogService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await catalogService.getFilms({ q: query || undefined, categoriaId: selectedCategory, sort, limit: 30 });
      setResults(res.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [query, selectedCategory, sort]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [doSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <SearchIcon className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar curtas..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border ${showFilters ? 'bg-brand-red text-white border-brand-red' : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !selectedCategory ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === cat.id ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['recentes', 'populares'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sort === s ? 'bg-brand-gold text-white border-brand-gold' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {s === 'recentes' ? 'Recentes' : 'Populares'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((film) => {
            const capa = mediaUrl(film.media_assets?.find((a) => a.tipo === 'thumbnail')?.path_comprimido ?? film.capa_path);
            return (
              <Link key={film.id} to={`/filme/${film.id}`} className="group block">
                <div className="aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
                  {capa ? (
                    <img src={capa} alt={film.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Play className="w-10 h-10 text-neutral-400" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 rounded-full bg-brand-red/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
                <div className="mt-2 px-1">
                  <h3 className="font-semibold text-sm truncate group-hover:text-brand-red transition-colors">{film.titulo}</h3>
                  <span className="flex items-center gap-1 text-xs text-neutral-500 mt-1"><Eye className="w-3 h-3" /> {formatViews(film.visualizacoes)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-neutral-500">
          <SearchIcon className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum resultado encontrado.</p>
        </div>
      )}
    </div>
  );
}
