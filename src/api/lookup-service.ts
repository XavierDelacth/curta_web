import { Categoria, RoleOut } from '@/types';
import api from './http-client';

export const lookupService = {
  getRoles: () => api.get<RoleOut[]>('/lookup/roles').then((r) => r.data),
  getCategorias: () => api.get<Categoria[]>('/lookup/categorias').then((r) => r.data),
};
