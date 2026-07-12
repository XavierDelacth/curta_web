import { Categoria, CurtaOut } from '@/types';
import api from './http-client';

export interface SearchParams {
  q?: string;
  categoriaId?: string;
  tagIds?: string[];
  sort?: 'recentes' | 'populares' | 'criado_em' | 'titulo' | 'popularidade';
  page?: number;
  perPage?: number;
  limit?: number;
  offset?: number;
}

export const catalogService = {
  getFeed: () =>
    api.get<{ destaques: CurtaOut[]; populares: CurtaOut[] }>('/catalog/feed').then((r) => r.data),

  getFilms: async (params: SearchParams = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('titulo', params.q);
    if (params.categoriaId) qs.set('categoria_id', params.categoriaId);
    const sortMap: Record<string, string> = { recentes: 'criado_em', populares: 'popularidade' };
    qs.set('ordenar', sortMap[params.sort ?? ''] ?? 'criado_em');
    const limit = params.limit ?? params.perPage ?? 20;
    const offset = params.offset ?? ((params.page ?? 1) - 1) * limit;
    qs.set('limit', String(limit));
    qs.set('offset', String(offset));
    const query = qs.toString();
    const { data } = await api.get<CurtaOut[]>(`/curtas/${query ? `?${query}` : ''}`);
    return {
      data,
      total: data.length,
      page: params.page ?? 1,
      per_page: limit,
      total_pages: Math.ceil(data.length / limit) + 1,
    };
  },

  getCategories: () => api.get<Categoria[]>('/lookup/categorias').then((r) => r.data),

  getTags: () => api.get<{ id: string; nome: string }[]>('/lookup/tags').then((r) => r.data),

  getFilm: (id: string) => api.get<CurtaOut>(`/curtas/${id}`).then((r) => r.data),
};
