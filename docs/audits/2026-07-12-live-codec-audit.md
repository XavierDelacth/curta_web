# Auditoria — curta_web: codec WHIP publish

Data: 2026-07-12
Âmbito: Apenas leitura/análise de código. Nenhum ficheiro de produção foi alterado.

## Resumo executivo

O `useWhipBroadcaster.ts` (publish WHIP) não força nenhum codec de vídeo —
as tracks são adicionadas via `addTrack()` sem `setCodecPreferences()`,
deixando o browser negociar o codec por omissão. Em testes reais com
Chrome, o browser enviou exclusivamente H264 (7 payload types, todos
H264) e o MediaMTX converteu com sucesso para HLS ("2 tracks (H264,
Opus)"). O codec **não é a causa do problema**. No entanto, a ausência
de `setCodecPreferences()` no publish é uma fragilidade latente para
futuros browsers ou plataformas que possam negociar VP8/VP9.

## Evidências

### 1. `useWhipBroadcaster.ts` — sem `setCodecPreferences()`

Ficheiro: `src/hooks/useWhipBroadcaster.ts`

**Linhas 33-35 — Adição de tracks:**
```typescript
stream.getTracks().forEach((track) => {
  pc.addTrack(track, stream);
});
```

- As tracks são adicionadas com `addTrack()` simples, sem `addTransceiver()` nem `setCodecPreferences()`.
- Não há qualquer filtro de codecs.

**Contraste: WHEP playback usa `setCodecPreferences()`**

Ficheiro: `src/components/live/useWhepPlayer.ts`, linhas 47-52:
```typescript
const transceiver = pc.addTransceiver('video', { direction: 'recvonly' });
transceiver.setCodecPreferences(
  RTCRtpReceiver.getCapabilities('video')?.codecs.filter(
    (c) => c.mimeType === 'video/H264' || c.mimeType === 'video/VP8' || c.mimeType === 'video/VP9',
  ) ?? [],
);
```

O lado de reprodução (WHEP) **filtra codecs explicitamente**, mas o lado
de publicação (WHIP) não.

### 2. MediaMTX — sem restrições de codec

Ficheiro: `curta_backend/mediamtx.yml`

- **Linhas 24-30** — Config WebRTC (WHIP/WHEP):
  ```yaml
  webrtc: yes
  webrtcAddress: :8889
  webrtcICEServers2:
    - url: stun:stun.l.google.com:19302
  ```
- **Linhas 40-42** — Path catch-all sem restrições de codec:
  ```yaml
  paths:
    all:
      source: publisher
  ```
  - Ausência de `webrtcVideoCodec`, `webrtcAudioCodec`, ou per-path codec filters.
  - MediaMTX aceita qualquer codec enviado pelo publisher.

### 3. SDP real capturado em `mtx_debug_stdout.txt`

Ficheiro: `curta_backend/mediamtx/bin/mtx_debug_stdout.txt`

**Linhas 62, 91-139 — Offer SDP do browser (Chrome):**
```
m=video 9664 UDP/TLS/RTP/SAVPF 103 107 109 115 117 39 119
a=rtpmap:103 H264/90000
a=rtpmap:107 H264/90000
a=rtpmap:109 H264/90000
a=rtpmap:115 H264/90000
a=rtpmap:117 H264/90000
a=rtpmap:39 H264/90000
a=rtpmap:119 H264/90000
```

**Todos os 7 payload types de vídeo são H264** (Baseline, Constrained
Baseline, Main, High profiles). Nenhum VP8, VP9, ou AV1.

**Linha 192 — Answer SDP do MediaMTX:**
```
m=video 9 UDP/TLS/RTP/SAVPF 103 109
```

MediaMTX selecionou H264 (PT 103 e 109).

**Linhas 219-220 — Stream publicada com sucesso:**
```
INF stream is available and online, 2 tracks (Opus, H264)
```

**Linha 242 — HLS remux com sucesso:**
```
INF is converting into HLS, 2 tracks (H264, Opus)
```

### 4. Backend — proxy WHIP transparente, sem manipulação de SDP

Ficheiro: `curta_backend/app/api/v1/routes/live.py`, linhas 158-179:

```python
sdp_offer = await request.body()
# ...
async with httpx.AsyncClient() as client:
    resp = await client.post(
        mediamtx_whip_url,
        content=sdp_offer,
        headers={"Content-Type": "application/sdp"},
    )
```

O SDP é reencaminhado byte-por-byte ao MediaMTX sem qualquer
normalização, filtro de codec, ou modificação.

### 5. Logs do MediaMTX — sem erros de codec

Ficheiro: `curta_backend/mediamtx/bin/mtx_debug_stdout.txt`

- **Linhas 223-233** — Único erro presente:
  ```
  ERR [HLS] [muxer bcda6948-...] muxer instance crashed: Low-Latency HLS requires at least 7 segments
  ```
  Isto é um erro de **configuração de segment count** (`hlsSegmentCount: 7`
  no `bin/mediamtx.yml`), **não relacionado com codecs**. A raiz
  `mediamtx.yml` já tem `hlsSegmentCount: 12` (linha 18), que resolve
  o problema.

- **Linhas 261** — Nenhum erro ou aviso relacionado com codec não
  suportado para remux HLS em qualquer live.

## Hipótese 1 — Codec de vídeo não remuxável para HLS

Conclusão: **Refutada**

Evidência:
- Em testes reais com Chrome, o browser publicou **apenas H264** (sete variações de profile), não VP8/VP9.
- O MediaMTX converteu com sucesso o stream WebRTC (H264 + Opus) para HLS: "is converting into HLS, 2 tracks (H264, Opus)".
- Não há **nenhum erro de codec nos logs**. Todos os erros nos logs são de configuração (`hlsSegmentCount`), não de codec.
- O backend é um proxy transparente — não modifica o SDP.
- O MediaMTX não tem restrições de codec configuradas — aceita o que o publisher enviar.

**Caveat (fragilidade latente):** O publisher WHIP não força H264 via
`setCodecPreferences()`. Num browser que por omissão negocie VP8 (ex:
Firefox sem hardware H264, ou Safari com configurações específicas), o
MediaMTX aceitaria VP8 no WebRTC mas **não conseguiria remux para HLS**,
causando o cenário "só áudio" descrito na hipótese. Isto **não
aconteceu nos testes** — Chrome enviou H264 sempre — mas é um risco
documentado.

## Hipótese 2 — Loop de polling sem backoff no mobile

Conclusão: **N/A — ver report curta_frontend**

## Outros achados relevantes

1. **`hlsSegmentCount` inconsistente entre configs**: A raiz
   `mediamtx.yml` (linha 18) tem `hlsSegmentCount: 12`, mas o
   `mediamtx/bin/mediamtx.yml` usado pelo processo em execução tinha
   `hlsSegmentCount: 7`, que causava crash do muxer HLS. Isto pode ter
   deixado o HLS indisponível durante o período afetado, forçando o
   mobile a receber respostas 404 ou listas vazias.

2. **`serve_live_hls` proxy mistura disco e MediaMTX**: O HLS de WHIP
   serve-se via proxy do backend para MediaMTX com tradução
   `master.m3u8` → `index.m3u8`. O de browser/RTMP serve-se do disco
   local. Se o disco tiver vestígios de lives antigas, o backend pode
   estar a servir conteúdo dead/stale em vez do HLS ativo do MediaMTX.

## Correção proposta (NÃO aplicada)

### Adicionar `setCodecPreferences()` a `useWhipBroadcaster.ts`

Ficheiro: `src/hooks/useWhipBroadcaster.ts`

**Onde:** Substituir o loop `addTrack` atual (linhas 33-35) por
`addTransceiver` com codec preferences forçando H264, seguido de
`addTrack` para as tracks individuais.

**Código proposto (bloco de substituição para as linhas 33-35):**

```typescript
// Forçar H264 no publish para garantir remux HLS
const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];

if (videoTrack) {
  const transceiver = pc.addTransceiver(videoTrack, { direction: 'sendonly' });
  // Filtrar apenas H264 (elimina VP8/VP9 que MediaMTX não remuxa para HLS)
  const codecs = RTCRtpSender.getCapabilities('video')?.codecs.filter(
    (c) => c.mimeType === 'video/H264',
  ) ?? [];
  if (codecs.length > 0) {
    transceiver.setCodecPreferences(codecs);
  }
}
if (audioTrack) {
  pc.addTrack(audioTrack, stream);
}
```

**Porquê:** O Chrome enviou H264 espontaneamente, mas Firefox e outros
browsers podem não o fazer. Forçar H264 explicitamente no publish
elimina o risco de VP8/VP9 que o MediaMTX não consegue remuxar para
HLS. Isto espelha a mesma preocupação que o `useWhepPlayer.ts` já
resolve no lado da reprodução.

### Alinhar `mediamtx.yml` do binário ativo com a raiz

Ficheiro: `curta_backend/mediamtx/bin/mediamtx.yml` (ou garantir que o
`main.py` aponta para a config da raiz em vez do bin)

**Porquê:** A raiz tem `hlsSegmentCount: 12` correcto, mas o binário
activo usa `hlsSegmentCount: 7` que causa crash do muxer HLS. O
processo em execução (`main.py` linha 38: `Path("mediamtx/mediamtx.yml")`)
já aponta para a config correcta da raiz desde que o `mediamtx.yml` na
raiz exista (a condição da linha 37 é verdadeira). Se o erro persistir,
verificar que a config da raiz está a ser lida.

## O que não foi possível confirmar nesta sessão

- **Comportamento do Firefox/Edge/Safari** ao publicar WHIP — testado
  apenas com Chrome. Cada browser pode negociar codecs diferentes por
  omissão.
- **Logs do MediaMTX durante uma live whip ativa** — o ficheiro
  `mtx_debug_stdout.txt` é de 2026-07-03, não reflecte o estado actual
  do servidor.
- **Se o ficheiro de debug do MediaMTX (`mtx_test_*.txt`) está a ser
  escrito actualmente** ou se o stdout/stderr do processo estão a ser
  perdidos.
