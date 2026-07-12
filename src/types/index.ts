export type UserRole = 'espectador' | 'realizador' | 'admin' | 'administrador';
export type UserStatus = 'ativo' | 'bloqueado';

export interface UserOut {
  id: string;
  nome: string;
  email: string;
  role_id: string;
  status: UserStatus;
  criado_em: string;
}

export interface RoleOut {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
}

export interface TagOut {
  id: string;
  nome: string;
}

export type FilmStatus = 'rascunho' | 'a_processar' | 'publicado' | 'erro';

export interface Film {
  id: string;
  autor_id: string;
  titulo: string;
  descricao: string;
  categoria_id: string;
  video_path: string | null;
  capa_url: string | null;
  capa_importada_url: string | null;
  status: FilmStatus;
  visualizacoes: number;
  publicado_em: string | null;
  criado_em: string;
  media_assets: MediaAssetOut[];
  streaming_variantes: StreamingVarianteOut[];
}

export interface MediaAssetOut {
  id: string;
  curta_id: string;
  tipo: 'video' | 'thumbnail';
  path_original: string;
  path_comprimido: string | null;
  tamanho_original: number;
  tamanho_comprimido: number | null;
  taxa_compressao: number | null;
  tempo_processamento_ms: number | null;
  qualidade_ssim: number | null;
  formato: 'mp4' | 'jpg';
  estado: string;
}

export interface StreamingVarianteOut {
  id: string;
  curta_id: string;
  resolucao: '144p' | '240p' | '360p' | '480p' | '720p' | '1080p';
  bitrate_kbps: number;
  path_manifest: string;
}

export interface CurtaOut {
  id: string;
  autor_id: string;
  titulo: string;
  descricao: string;
  categoria_id: string;
  video_path: string | null;
  capa_path: string | null;
  capa_importada_path: string | null;
  status: FilmStatus;
  visualizacoes: number;
  total_gostos: number;
  total_nao_gostos: number;
  publicado_em: string | null;
  criado_em: string;
  media_assets: MediaAssetOut[];
  streaming_variantes: StreamingVarianteOut[];
}

export interface CurtaStatusOut {
  id: string;
  status: FilmStatus;
}

export interface FilmPayload {
  titulo: string;
  descricao: string;
  categoriaId: string;
  tagIds: string[];
}

export type AvaliacaoTipo = 'gosto' | 'nao_gosto';

export interface AvaliacaoOut {
  id: string;
  utilizador_id: string;
  curta_id: string;
  tipo: AvaliacaoTipo;
  criado_em: string;
}

export interface AvaliacaoSummary {
  total_gostos: number;
  total_nao_gostos: number;
  avaliacao_utilizador: AvaliacaoTipo | null;
}

export interface ComentarioOut {
  id: string;
  utilizador_id: string;
  curta_id: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string | null;
  eliminado_em: string | null;
}

export interface FavoritoOut {
  id: string;
  utilizador_id: string;
  curta_id: string;
  adicionado_em: string;
}

export interface DownloadOut {
  id: string;
  utilizador_id: string;
  curta_id: string;
  descarregado_em: string;
  eliminado_em: string | null;
}

export interface VisualizacaoOut {
  id: string;
  utilizador_id: string | null;
  curta_id: string;
  percentagem_assistida: number;
  segundos_assistidos: number | null;
  contabilizada: boolean;
  assistido_em: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthSession {
  user: UserOut;
  tokens: AuthTokens;
}

export interface DashboardStats {
  total_utilizadores: number;
  total_curtas: number;
  total_visualizacoes: number;
  total_downloads: number;
  total_gostos: number;
  total_nao_gostos: number;
  total_comentarios: number;
  utilizadores_ativos: number;
  utilizadores_bloqueados: number;
  curtas_publicadas: number;
  curtas_rascunho: number;
}

export interface SystemLogOut {
  id: string;
  utilizador_id: string;
  tipo_evento: string;
  descricao: string;
  dados_extras: Record<string, unknown> | null;
  ip_address: string | null;
  criado_em: string;
}

export interface PermissaoOut {
  id: string;
  recurso: string;
  acao: string;
}

export interface UserStats {
  total_uploads: number;
  total_favoritos: number;
  total_comentarios: number;
}

export interface HistoryItem {
  id: string;
  curta: CurtaOut;
  progresso_segundos: number;
  progresso_percentagem: number;
  assistido_em: string;
}

export interface OfflineFilm {
  id: string;
  curta_id: string;
  titulo: string;
  localPath: string;
  savedAt: string;
  fileSize: number;
}

export interface LiveOut {
  id: string;
  criador_id: string;
  criador_nome: string;
  titulo: string;
  descricao: string;
  status: string;
  source: string;
  rtmp_url: string;
  hls_url: string;
  iniciado_em: string;
}

export interface LiveCreateRequest {
  titulo: string;
  descricao: string;
  source?: string;
}

export interface LiveIniciarResponse {
  id: string;
  titulo: string;
  rtmp_url: string;
  hls_url: string;
  source: string;
  mensagem: string;
}

export interface LiveDetail extends LiveOut {
  terminado_em?: string | null;
}

export interface SolicitacaoOut {
  id: string;
  utilizador_id: string;
  utilizador_nome: string;
  utilizador_email: string;
  estado: 'pendente' | 'aceite' | 'rejeitado';
  motivo_rejeicao: string | null;
  criado_em: string;
  atualizado_em: string | null;
}
