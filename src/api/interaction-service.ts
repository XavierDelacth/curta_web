import { AvaliacaoOut, AvaliacaoSummary, ComentarioOut, FavoritoOut } from '@/types';
import api from './http-client';

export const interactionService = {
  toggleLike: (curtaId: string) =>
    api.post<AvaliacaoOut>(`/interacoes/${curtaId}/avaliacao`, { tipo: 'gosto' }).then((r) => r.data),

  toggleDislike: (curtaId: string) =>
    api.post<AvaliacaoOut>(`/interacoes/${curtaId}/avaliacao`, { tipo: 'nao_gosto' }).then((r) => r.data),

  getAvaliacaoSummary: (curtaId: string) =>
    api.get<AvaliacaoSummary>(`/interacoes/${curtaId}/avaliacoes`).then((r) => r.data),

  getFavoritos: () =>
    api.get<FavoritoOut[]>('/interacoes/favoritos').then((r) => r.data),

  toggleFavorite: (curtaId: string) =>
    api.post<FavoritoOut>(`/interacoes/${curtaId}/favoritos`).then((r) => r.data),

  removeFavorite: (curtaId: string) =>
    api.delete(`/interacoes/${curtaId}/favoritos`).then((r) => r.data),

  getComments: (curtaId: string) =>
    api.get<ComentarioOut[]>(`/interacoes/${curtaId}/comentarios`).then((r) => r.data),

  addComment: (curtaId: string, conteudo: string) =>
    api.post<ComentarioOut>(`/interacoes/${curtaId}/comentarios`, { conteudo }).then((r) => r.data),

  deleteComment: (curtaId: string, comentarioId: string) =>
    api.delete(`/interacoes/${curtaId}/comentarios/${comentarioId}`).then((r) => r.data),
};
