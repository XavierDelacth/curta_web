# Diagnóstico do Live Streaming no curta_web

> Data: 2026-07-12
> Objetivo: Documentar a implementação atual antes de planear a migração de LL-HLS para WHEP na reprodução.
> Nenhum ficheiro foi alterado — apenas investigação.

---

## 1. Stack e Estrutura do Projeto

### Framework

| Componente | Tecnologia | Versão |
|---|---|---|
| **Framework** | Vite + React | Vite `^6.0.0`, React `^18.3.1` |
| **Linguagem** | TypeScript | `^5.6.3` |
| **Roteamento** | React Router DOM | `^6.28.0` |
| **Estado global** | Zustand | `^5.0.0` |
| **HTTP client** | Axios | `^1.7.9` |
| **Ícones** | lucide-react | `^0.460.0` |
| **CSS** | Tailwind CSS | `^3.4.16` |
| **Bundler** | Vite | `^6.0.0` |

### Dependências específicas de vídeo/streaming

| Dependência | Versão | Uso |
|---|---|---|
| **hls.js** | `^1.6.16` | Única lib de streaming. Usada na reprodução de HLS tanto para filmes como para lives. |

Não existem `video.js`, `react-player`, ou qualquer wrapper WebRTC.

### Estrutura de pastas relevante

```
src/
  pages/
    live/
      LivePlayerPage.tsx    ← Player de visualização da live (hls.js)
      CreateLivePage.tsx     ← Criação de live (escolhe título, fonte RTMP por defeito)
      LiveStreamPage.tsx     ← Transmissão do browser (MediaRecorder → HTTP chunks)
  api/
    live-service.ts          ← Serviço HTTP para endpoints de live
  types/
    index.ts                 ← Interfaces LiveOut, LiveDetail, LiveIniciarResponse, LiveCreateRequest
  App.tsx                    ← Rotas: /live/criar, /live/:id, /live/:id/stream
```

### Rotas de live (App.tsx:68-70)

| Rota | Componente | Proteção |
|---|---|---|
| `/live/criar` | `CreateLivePage` | `AuthGuard` |
| `/live/:id` | `LivePlayerPage` | Pública |
| `/live/:id/stream` | `LiveStreamPage` | `AuthGuard` |

---

## 2. Fluxo de Dados da Live (Fim a Fim)

### 2.1 Criação da Live

**Ficheiro:** `src/pages/live/CreateLivePage.tsx` (94 linhas)

1. Utilizador preenche título e descrição.
2. Clica "Criar Live".
3. `handleCreate` (linha 15) chama `liveService.iniciar({ titulo, descricao, source: 'rtmp' })`.
4. A resposta (`LiveIniciarResponse`) contém:
   - `rtmp_url` — URL RTMP para enviar para OBS/FFmpeg
   - `hls_url` — URL HLS para visualização
   - `id` — UUID da live
5. É apresentado ecrã pós-criação com botão "Iniciar transmissão" que navega para `/live/{id}/stream`.

### 2.2 Transmissão (Streaming) via Browser

**Ficheiro:** `src/pages/live/LiveStreamPage.tsx` (112 linhas)

Fluxo:
1. **Ligar câmara** (linha 21-27): `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
2. **Iniciar transmissão** (linha 38-51):
   - Cria `MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })`.
   - `mr.start(1000)` — chunks de 1 segundo.
   - `ondataavailable` envia cada chunk via `liveService.pushChunk(id, blob)`.
3. **Parar transmissão** (linha 53-57): `mr.stop()` + `liveService.finishPush(id)`.
4. **Terminar live** (linha 59-65): `liveService.terminar(id)` + desliga câmara.

**Observação crítica:** O método de streaming do browser usa **MediaRecorder com codec VP8** em vez de WHIP/WebRTC. O backend precisa de receber chunks fMP4 e gerar HLS localmente (ver secção 5).

### 2.3 Reprodução (Player)

**Ficheiro:** `src/pages/live/LivePlayerPage.tsx` (64 linhas)

```typescript
// Linhas 20-31 — inicialização do hls.js
useEffect(() => {
  if (!live?.hls_url || !videoRef.current) return;
  const video = videoRef.current;
  if (Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true });  // ← Única opção de configuração
    hls.loadSource(live.hls_url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = live.hls_url;
  }
}, [live]);
```

**O player:**
- É montado no mesmo componente da página (`LivePlayerPage.tsx`) — não há componente separado.
- Usa `useRef<HTMLVideoElement>(null)` para referência ao elemento `<video>`.
- O `live.hls_url` vem do backend (formato `/live-hls/{id}/master.m3u8`).
- Fallback nativo HLS para Safari/iOS.
- **Não há** lógica de reconexão, retry, ou tratamento de erro se a live cair ou o stream ainda não começou.

### 2.4 Stack de Configuração do hls.js

**Configuração exata (LivePlayerPage.tsx:24):**
```typescript
const hls = new Hls({ lowLatencyMode: true });
```

**Configuração exata para filmes (FilmPlayerPage.tsx — para referência):**
```typescript
const hls = new Hls({
  lowLatencyMode: true,
  maxBufferLength: 10,
  maxMaxBufferLength: 30,
  liveDurationInfinity: false,
});
```

Ambas as instâncias usam configuração mínima. **Não há** `liveSyncDuration`, `liveMaxLatencyDuration`, `maxBufferLength` para a live especificamente.

### 2.5 Polling de Viewers

(LivePlayerPage.tsx:33-39)
```typescript
useEffect(() => {
  if (!id) return;
  const interval = setInterval(() => {
    liveService.obterViewers(id).then((d) => setViewers(d.total)).catch(() => {});
  }, 5000);
  return () => clearInterval(interval);
}, [id]);
```

**Polling de 5 segundos** para contagem de viewers via `GET /live/{id}/viewers`.

**Nota:** O backend também suporta SSE em `/live/{id}/events` para eventos em tempo real (live terminada, pausada, retomada), mas o **curta_web não usa** este endpoint. Apenas o `curta_frontend` mobile usa SSE no player.

### 2.6 Listagem de Lives na Home Page

**Ficheiro:** `src/pages/home/HomePage.tsx`

- Linha 165: `liveService.listarAtivas().catch(() => [])` chamado em paralelo com o feed.
- Se `lives.length > 0`, renderiza secção **"A ao vivo"** (linhas 216-241).
- Cada card é um `<Link to={/live/${live.id}}>` com dot pulsante, badge "AO VIVO", título e nome do criador.

### 2.7 Service Layer (API)

**Ficheiro:** `src/api/live-service.ts` (31 linhas)

| Método | Endpoint | Uso |
|---|---|---|
| `listarAtivas()` | `GET /live/` | Home page |
| `iniciar(data)` | `POST /live/iniciar` | Criação |
| `obter(id)` | `GET /live/{id}` | Detalhes da live |
| `terminar(id)` | `POST /live/{id}/terminar` | Fim da live |
| `pushChunk(id, blob)` | `POST /live/{id}/push-chunk` (fetch direto, auth via Bearer) | Chunks de vídeo |
| `finishPush(id)` | `POST /live/{id}/finish-push` | Fim de chunks |
| `obterViewers(id)` | `GET /live/{id}/viewers` | Contagem de viewers |

---

## 3. Gestão de Estado e Ciclo de Vida

### 3.1 Ciclo de Vida do Player (LivePlayerPage.tsx)

- `useEffect` no mount (linha 15-18): carrega dados da live via `liveService.obter(id)`.
- `useEffect` dependente de `live` (linha 20-31): inicializa `hls.js` quando os dados chegam.
- `useEffect` para polling viewers (linha 33-39): intervalo de 5 segundos, cleanup com `clearInterval` no unmount.
- **Não há cleanup explícito do hls.js** — quando o componente desmonta, a instância `hls` é perdida (variável local do `useEffect`), mas não é chamado `hls.destroy()`. Isto pode causar fugas de memória ou pedidos de rede órfãos.

### 3.2 Cleanup do hls.js

```typescript
// Atual (sem destroy):
useEffect(() => {
  if (!live?.hls_url || !videoRef.current) return;
  const video = videoRef.current;
  if (Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true });
    hls.loadSource(live.hls_url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
  } else if (...) { ... }
}, [live]);
```

**Problema:** A instância `hls` nunca é destruída. Se o `live` mudar ou o componente desmontar, o `hls.js` continua ativo.

### 3.3 Cleanup do MediaRecorder (LiveStreamPage.tsx)

- `mediaRecorderRef.current?.stop()` chamado manualmente (linha 54).
- `stopCamera` para todos os tracks do `MediaStream` (linha 29-36).

### 3.4 Estado Global

- **Zustand (`auth-store.ts`)**: usado para auth token (Bearer token nos requests).
- **Não há estado global para live**. Tudo é estado local do componente (`useState` + `useRef`).

### 3.5 Autenticação

- O token JWT é injetado no header `Authorization: Bearer <token>` pelo interceptor do Axios (http-client.ts:39-45) para todos os requests regulares.
- `pushChunk` usa `fetch` direto com token do store (live-service.ts:18-23).

---

## 4. Compatibilidade com WebRTC Nativo do Browser

### 4.1 APIs WebRTC

| API | Ocorrências em src/ | Ficheiro |
|---|---|---|
| `RTCPeerConnection` | **0** | — |
| `navigator.mediaDevices` | **1** | `LiveStreamPage.tsx:23` (apenas `getUserMedia`) |
| `WHEP` | **0** | — |
| `WHIP` | **0** | — |

**Não existe qualquer implementação WebRTC no curta_web.** A captura de media usa `getUserMedia` + `MediaRecorder`, mas a transmissão é via HTTP chunks.

### 4.2 Content Security Policy (CSP)

**Não existe CSP configurado no projeto.** Nenhum header CSP, meta tag, ou configuração no Vite. Zero ocorrências de `Content-Security-Policy`, `script-src`, `connect-src`, ou `media-src` no código fonte.

Isto significa que **não há bloqueios de CSP para WebRTC**. APIs como `RTCPeerConnection` e `getUserMedia` funcionam sem restrições.

### 4.3 SSR / Renderização do Lado do Servidor

O projeto é **CSR puro** (Client-Side Rendering):
- `main.tsx` usa `ReactDOM.createRoot()` diretamente.
- Não existe Next.js, Remix, ou qualquer framework SSR.
- Todos os `useEffect` executam exclusivamente no browser.
- **Não há problemas** de compatibilidade com SSR para WebRTC.

---

## 5. Análise do Backend (curta_backend)

### 5.1 Arquitetura Geral

**Modelo de BD** — `app/models/live.py`:

```python
class LiveStream(Base):
    __tablename__ = "live_streams"
    id: UUID PK
    criador_id: FK → users
    titulo: str(200)
    descricao: Text
    status: str(20)  # "ativa" | "pausada" | "terminada"
    rtmp_url: str(500)
    hls_url: str(500)
    iniciado_em: datetime
    terminado_em: datetime | None
    ultimo_chunk_em: datetime | None
```

**As lives são eliminadas da BD ao terminar** (`db.delete(live)` + `db.commit()`).

### 5.2 Endpoints (app/api/v1/routes/live.py — 441 linhas)

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/live/` | Lista lives ativas |
| `POST` | `/live/iniciar` | Cria live com `source` (rtmp, browser, whip) |
| `GET` | `/live/{id}` | Detalhes da live |
| `POST` | `/live/{id}/whip` | Proxy WHIP: SDP offer → MediaMTX |
| `DELETE` | `/live/{id}/whip` | Termina sessão WHIP |
| `POST` | `/live/{id}/push-chunk` | Chunk de vídeo (browser) |
| `POST` | `/live/{id}/finish-push` | Fim de chunks |
| `POST` | `/live/{id}/terminar` | Termina live + cleanup |
| `POST` | `/live/{id}/pausar` | Pausa live |
| `POST` | `/live/{id}/retomar` | Retoma live |
| `GET` | `/live/{id}/events` | SSE com eventos em tempo real |
| `GET` | `/live/{id}/viewers` | Contagem de viewers (SSE-connected) |

### 5.3 Três Modos de Streaming

| Source | Criado por | Cadeia de processamento |
|---|---|---|
| **rtmp** | CriaLive (curta_web) ou OBS/FFmpeg | RTMP → FFmpeg → HLS (480p/720p/1080p) para disco |
| **browser** | MediaRecorder (curta_web) | HTTP chunks → fMP4 → HLS (single 720p) para disco |
| **whip** | WebRTC (curta_frontend mobile) | WHIP → MediaMTX → HLS (proxy, sem disco) |

### 5.4 Serviço de Live (app/services/live_service.py — 415 linhas)

**FFmpeg para RTMP:**
- `_build_ffmpeg_command()`: gera 3 variantes de qualidade (480p, 720p, 1080p) com `libx264`, `preset veryfast`, `tune zerolatency`. Gera HLS segments de 1 segundo com playlist tipo EVENT.
- `_run_ffmpeg_background()`: executa em thread separada (via `run_in_executor`).

**Browser HLS (DEPRECATED):**
- Código comentado: "DEPRECATED: WHIP via MediaMTX é o método recomendado". Mantido para retrocompatibilidade.
- `push_browser_segment()`: extrai init segment + moof de fMP4 chunks, escreve para disco, atualiza playlist.
- `end_browser_playlist()`: append `#EXT-X-ENDLIST`.

**Auto-terminação:**
- Loop a cada 30s que termina lives stale.
- Lives sem chunks por 10 min (nunca iniciadas) ou 3 min (após atividade).
- Verifica MediaMTX API antes de terminar streams WHIP ativos.

### 5.5 Serving HLS (main.py)

```python
# main.py:209-257
@app.api_route("/live-hls/{path:path}", methods=["GET", "HEAD"])
async def serve_live_hls(path: str, request: Request):
    file_path = Path(settings.LIVE_HLS_DIR) / path
    if file_path.exists() and file_path.is_file():
        # Serve do disco (RTMP/browser)
        return StreamingResponse(_stream_file(), ...)
    # Proxy para MediaMTX (WHIP)
    mediamtx_path = path.replace("/master.m3u8", "/index.m3u8")
    resp = await _mediamtx_client.get(f"http://localhost:8888/{mediamtx_path}")
    if resp.status_code == 200:
        return StreamingResponse(resp.aiter_bytes(), ...)
```

---

## 6. Pontos de Mudança para Migração WHEP

### 6.1 Ficheiros a Alterar ou Substituir

| Ficheiro | Ação | Motivo |
|---|---|---|
| `src/pages/live/LivePlayerPage.tsx` | **Substituir** | Trocar `hls.js` + `<video>` por `RTCPeerConnection` + `<video>` com fluxo WHEP |
| `src/api/live-service.ts` | **Adicionar** | Novo endpoint `GET /live/{id}/whep` para obter SDP offer do MediaMTX |
| `src/pages/home/HomePage.tsx` | **Nenhuma** (ou menor) | A listagem não depende do protocolo de reprodução |

### 6.2 Abstração Existente

**Não existe** componente `<LivePlayer>` separado. A lógica do player está inline em `LivePlayerPage.tsx`. Para uma migração limpa, recomenda-se:

1. Extrair `<LivePlayer>` para `src/components/live/LivePlayer.tsx` ou similar.
2. Criar hook `useWhepPlayer(liveId)` para encapsular a lógica WebRTC.

### 6.3 Dependências para WHEP

**Nenhuma dependência externa é estritamente necessária.** WebRTC (`RTCPeerConnection`) e WHEP são APIs nativas do browser.

Dependências opcionais (para simplificar):
- **Nenhuma** para o básico. Pode-se usar `RTCPeerConnection` + `fetch` nativos.

### 6.4 Número de Ficheiros Afetados

| Tipo | Quantidade |
|---|---|
| Ficheiros a **substituir** | 1 (`LivePlayerPage.tsx`) |
| Ficheiros a **adicionar** | 1 novo componente + 1 novo hook |
| Ficheiros a **modificar ligeiramente** | 1 (`live-service.ts`) |
| Ficheiros que **não precisam de mudanças** | `CreateLivePage.tsx`, `LiveStreamPage.tsx`, `HomePage.tsx`, `App.tsx` |

**A migração para WHEP está contida em 1-2 ficheiros principais.**

### 6.5 Pontos de Atenção

1. **Cleanup do hls.js atual**: O `LivePlayerPage.tsx` não faz `hls.destroy()` no unmount. Se for substituído por WHEP, é preciso garantir `pc.close()` no cleanup.
2. **Keep-alive do MediaMTX**: Ao contrário do hls.js (que reconecta automaticamente), WHEP precisa de ICE restart no MediaMTX se houver perda de sinal. Verificar `RTCPeerConnection` + `createOffer` com ICE restart.
3. **Fallback para HLS**: Manter fallback para browsers que não suportam WebRTC (Safari em modo restrito, navegadores antigos). O hls.js atual também serve para filmes — a migração afeta apenas lives.
4. **Baixa latência**: WHEP dá latência ~1-3s vs HLS ~5-10s. É a motivação principal da migração.
5. **SSE events**: O backend já suporta SSE em `/live/{id}/events`. O `curta_web` não usa — após migração, é ideal consumir para detetar fim da live em tempo real.

---

## 7. Resumo Final

A reprodução de live streaming no curta_web está atualmente implementada com hls.js num único ficheiro (`LivePlayerPage.tsx`, 64 linhas). O player é montado diretamente na página, sem componente separado, sem estado global, e sem lógica de reconexão ou tratamento de erros significativo. A configuração do hls.js é mínima (`{ lowLatencyMode: true }`) e não há `hls.destroy()` no cleanup — uma potencial fuga de memória. O método de streaming do browser usa `MediaRecorder` com codec VP8 em vez de WHIP/WebRTC, que é o método recomendado (marcado como DEPRECATED no backend). O backend já suporta WHIP (WebRTC ingest) via MediaMTX e WHEP (WebRTC playback) está disponível através do mesmo servidor MediaMTX — falta apenas o cliente frontend. A migração para WHEP é um trabalho contido: afeta 1-3 ficheiros, não requer dependências externas novas, e pode coexistir com o hls.js atual (que continuará a ser usado para filmes sob demanda). Não existem CSP ou SSR blockers. A principal recomendação é extrair a lógica do player para um componente/hook separado antes de implementar o cliente WHEP.
