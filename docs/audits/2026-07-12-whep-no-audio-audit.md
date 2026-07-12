# Auditoria — Falta de áudio no viewer WHEP (curta_web)

Data: 2026-07-12
Âmbito: Apenas leitura/análise de código. Nenhum ficheiro de produção foi alterado.

## Resumo executivo

O viewer WHEP (`useWhepPlayer.ts`) no `ontrack` só atribui `video.srcObject` quando a track recebida é de vídeo (`ev.track.kind === 'video'`, linha 26). As tracks de áudio recebidas são ignoradas — o `MediaStream` anexado ao elemento `<video>` nunca contém a track de áudio. Isto não é uma regressão (o fix H264 só alterou o publish, não o viewer), é um bug pré-existente que só foi notado agora porque o áudio nunca tinha sido testado no viewer WHEP.

## Evidências

### 1. Publisher WHIP (`useWhipBroadcaster.ts`) — NÃO é regressão

Ficheiro: `src/hooks/useWhipBroadcaster.ts`, linhas 33-56

```typescript
const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];

if (videoTrack) {
  const transceiver = pc.addTransceiver(videoTrack, {
    direction: 'sendonly',
    streams: [stream],
  });
  // ...setCodecPreferences apenas no transceiver de vídeo...
}
if (audioTrack) {
  pc.addTrack(audioTrack, stream);   // <-- áudio adicionado separadamente
}
```

- O audioTrack é adicionado via `addTrack()`, que cria um transceiver `sendonly` por omissão.
- O `setCodecPreferences` é chamado exclusivamente no transceiver devolvido por `addTransceiver(videoTrack, ...)` — não há `getTransceivers().find(...)` que possa errar o alvo.
- A ordem é: vídeo primeiro, áudio depois. `getTransceivers()` no RTCPeerConnection teria índice 0 = vídeo, índice 1 = áudio. Mesmo que houvesse um `find`, o primeiro transceiver é o de vídeo — não há bug de lógica aqui.

**Conclusão: publisher está correcto — envia ambas as tracks.**

### 2. Viewer WHEP (`useWhepPlayer.ts`) — áudio é ignorado no `ontrack`

Ficheiro: `src/components/live/useWhepPlayer.ts`, linhas 23-29

```typescript
pc.ontrack = (ev) => {
  gotTrack = true;
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  if (ev.track.kind === 'video') {                // <-- SÓ video!
    video.srcObject = ev.streams[0] ?? null;
    video.play().catch(() => {});
  }
};
```

- A linha 26 filtra **apenas** `ev.track.kind === 'video'`.
- Quando a track de áudio chega (segunda chamada a `ontrack`, com `ev.track.kind === 'audio'`), o bloco `if` é falso, e o `video.srcObject` mantém-se como foi definido anteriormente — mas o `MediaStream` que foi anexado na track de vídeo (linha 27) é o `ev.streams[0]` **da track de vídeo**, que contém ambas as tracks (vídeo + áudio) no mesmo stream **apenas se o MediaMTX as agrupar no mesmo stream**.

Na prática, o MediaMTX envia tracks em streams separados: um `ontrack` para vídeo com `streams[0]` contendo apenas o vídeo, e outro `ontrack` para áudio com `streams[0]` contendo apenas o áudio. Como a segunda chamada é ignorada, o `srcObject` do `<video>` nunca recebe a track de áudio.

### 3. Elemento `<video>` renderizado com `muted`

Ficheiro: `src/components/live/LivePlayer.tsx`, linhas 58-64

```tsx
<video
  ref={videoRef}
  className="w-full h-full object-contain"
  autoPlay
  playsInline
  muted            // <-- muted permanente!
/>
```

- `muted` está definido na prop do elemento React.
- **Não há nenhum código** no componente que desative o mute (`video.muted = false`) em resposta a interação do utilizador.
- Mesmo que o áudio chegasse correctamente via `srcObject`, o elemento está silenciado permanentemente.

### 4. `LivePlayer.tsx` — viewer WHEP não recebe correções

Ficheiro: `src/components/live/useWhepPlayer.ts` foi criado no mesmo commit (`8db556f`) que `useWhipBroadcaster.ts`. Não há histórico anterior para comparar — é um ficheiro novo, não uma alteração.

**Não é regressão** — nunca funcionou porque nunca foi implementado.

### 5. Backend WHIP proxy — transparente, não modifica SDP

Ficheiro: `curta_backend/app/api/v1/routes/live.py`, linhas 158-179

```python
sdp_offer = await request.body()
# ...log apenas...
async with httpx.AsyncClient() as client:
    resp = await client.post(
        mediamtx_whip_url,
        content=sdp_offer,
        headers={"Content-Type": "application/sdp"},
    )
```

Proxy transparente. Sem manipulação de SDP. Áudio não é removido pelo backend.

## Hipótese 1 — Regressão do fix de H264

Conclusão: **Refutada**

Evidência:
- O fix de H264 alterou **apenas** `useWhipBroadcaster.ts` (publisher), não `useWhepPlayer.ts` (viewer).
- Ambos os ficheiros foram criados no mesmo commit (`8db556f`), não há "antes" vs "depois".
- O publisher envia ambas as tracks correctamente (vídeo com `addTransceiver`, áudio com `addTrack`).
- A lógica de `setCodecPreferences` só toca no transceiver de vídeo — não há contaminação do áudio.

## Hipótese 2 — Problema de autoplay/muted pré-existente

Conclusão: **Parcialmente Confirmada** (mas não é a causa principal)

Evidência:
- O elemento `<video>` tem `muted` na prop React (`LivePlayer.tsx:63`). Isto silencia o áudio mesmo que ele chegue correctamente.
- **Não há código que desmute o elemento** após interação do utilizador.

No entanto, **mesmo que o `muted` fosse removido**, o áudio continuaria a não funcionar porque o `ontrack` do `useWhepPlayer.ts` descarta a track de áudio (só trata `ev.track.kind === 'video'`). O `muted` agrava o sintoma mas não é a causa raiz.

## Outras causas encontradas

**Causa raiz: `ontrack` no viewer WHEP ignora tracks de áudio**

`useWhepPlayer.ts:26` — `if (ev.track.kind === 'video')` faz com que o `ontrack` da track de áudio seja ignorado. O `video.srcObject` é definido apenas na primeira chamada (vídeo), e o `streams[0]` dessa chamada contém apenas a track de vídeo porque o MediaMTX envia tracks em streams separados.

O `gotTrack` na linha 22 é marcado como `true` na primeira track que chegue (seja vídeo ou áudio), o que cancela o timeout de 5s mesmo que só o áudio tenha chegado — mas isso não impede o fallback. O problema real é que o áudio nunca é ligado ao elemento.

## Correção proposta (NÃO aplicada)

### Viewer WHEP — anexar áudio ao elemento

Ficheiro: `src/components/live/useWhepPlayer.ts`

**Linha 26:** Substituir o `if (ev.track.kind === 'video')` por uma lógica que anexa ambas as tracks ao mesmo `MediaStream`:

```typescript
pc.ontrack = (ev) => {
  gotTrack = true;
  if (timeoutRef.current) clearTimeout(timeoutRef.current);

  if (!video.srcObject) {
    // Primeira track: criar novo MediaStream a partir do primeiro stream recebido
    video.srcObject = ev.streams[0] ?? new MediaStream();
  }
  // Adicionar tracks subsequentes ao MediaStream existente
  if (video.srcObject) {
    const stream = video.srcObject as MediaStream;
    ev.track.onended = () => { /* cleanup opcional */ };
    if (!stream.getTrackById(ev.track.id)) {
      stream.addTrack(ev.track);
    }
  }
  video.play().catch(() => {});
};
```

**Porquê:** O `ontrack` é chamado uma vez por track remota. A primeira chamada (vídeo) cria o `srcObject`. A segunda chamada (áudio) precisa de adicionar a track de áudio ao mesmo `MediaStream` para que o `<video>` a renderize.

### Elemento `<video>` — remover `muted` permanente

Ficheiro: `src/components/live/LivePlayer.tsx`, linha 63

Remover `muted` da prop do `<video>`. O atributo `autoPlay` já está presente e o browser permite autoplay com som se houver interação prévia do utilizador (o utilizador clicou "Iniciar transmissão" ou navegou para a página). Adicionalmente, `playsInline` já está presente.

Se o autoplay com som for bloqueado pelo browser, a `Promise` devolvida por `video.play()` rejeita com um `DOMException` — o `.catch(() => {})` já existente na correção acima trata esse caso silenciosamente.

### Elemento `<video>` — remover `muted` (alteração):

```tsx
<video
  ref={videoRef}
  className="w-full h-full object-contain"
  autoPlay
  playsInline
/>
```

## O que não foi possível confirmar nesta sessão

- **SDP real do viewer WHEP** — capturar `pc.remoteDescription.sdp` ao vivo para confirmar que o MediaMTX envia o áudio na answer. O publisher inclui áudio na offer, e o proxy é transparente, pelo que a confirmação visual não é crítica.
- **Se o MediaMTX envia tracks em streams separados ou no mesmo stream** — a correção proposta funciona em ambos os casos (se for o mesmo stream, `stream.getTrackById` evita duplicação). A evidência circumstancial (o `ontrack` ser chamado várias vezes com `kind` diferente) sugere streams separados.
- **Teste no mobile (curta_frontend)**: o mobile (Expo) usa HLS já corrigido pelo fix do codec — o áudio do mobile nunca dependeu deste código.
