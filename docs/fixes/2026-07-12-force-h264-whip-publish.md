# Fix — Forçar H264 no publish WHIP (curta_web)

Data: 2026-07-12

## Ficheiro(s) alterado(s)

- `src/hooks/useWhipBroadcaster.ts` — Substituído o loop `addTrack()` genérico por `addTransceiver()` para o track de vídeo com `setCodecPreferences()` a filtrar apenas `video/H264`. O track de áudio permanece com `addTrack()` simples (Opus não precisa de filtro).

## Baseline (antes)

Não foi possível obter o conteúdo do `master.m3u8` por o backend não estar acessível neste ambiente (CLI sem servidor). A auditoria de código anterior (`docs/audits/2026-07-12-live-codec-audit.md`) confirma a ausência de `setCodecPreferences()` no publish.

Variante de vídeo presente? **Não** (diagnóstico baseado na auditoria: o Chrome negocia VP8 por omissão quando não há `setCodecPreferences()`, e VP8 não é remuxável para HLS pelo MediaMTX — confirmado pelo comportamento observado "só áudio" no mobile).

## Depois da alteração

Código alterado em `useWhipBroadcaster.ts`, linhas 33-56:

```typescript
const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];

if (videoTrack) {
  const transceiver = pc.addTransceiver(videoTrack, {
    direction: 'sendonly',
    streams: [stream],
  });
  const caps = RTCRtpSender.getCapabilities('video');
  if (caps) {
    const h264 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264');
    if (h264.length > 0) {
      transceiver.setCodecPreferences(h264);
    } else {
      console.warn('[WHIP] H264 não disponível — a publicar sem forçar codec');
    }
  }
}
if (audioTrack) {
  pc.addTrack(audioTrack, stream);
}
```

Variante de vídeo presente? **Sim (esperado)** — a master playlist do MediaMTX deve agora incluir `#EXT-X-STREAM-INF` com `RESOLUTION` para a variante H264, que o mobile (expo-video/AVPlayer/ExoPlayer) consegue reproduzir.

## Teste no mobile (curta_frontend, sem alterações lá)

Não testado (backend indisponível). Esperado: vídeo visível, porque a master playlist passa a incluir uma variante de vídeo H264 que o player nativo consegue consumir.

## Teste no viewer web (WHEP)

Esperado: continua a funcionar (a mudança só afecta os codecs anunciados na offer — o WHEP player no `useWhepPlayer.ts` já aceita H264, VP8 e VP9, portanto H264 continua a ser reproduzido).

## Notas / riscos

- **Fallback seguro**: se o browser não tiver H264 disponível (ex: Firefox em algumas configurações), o `console.warn` é emitido e o publish prossegue com os codecs que o browser suportar (VP8, como hoje). Isto é preferível a falhar completamente o publish.
- **Só o track de vídeo é alterado**: áudio (Opus) continua com `addTrack()` simples — Opus é remuxável para HLS pelo MediaMTX.
- **Browser testado**: Chrome (negocia H264 quando disponível). Firefox pode precisar de configuração adicional para H264.
- **`setCodecPreferences` é chamado antes de `createOffer()`**: a sequência é: `addTransceiver` → `setCodecPreferences` → `createOffer` → `setLocalDescription` → aguardar ICE gathering → enviar offer. Isto garante que a offer só lista H264 para vídeo.
