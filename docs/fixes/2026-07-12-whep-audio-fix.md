# Fix — Áudio no viewer WHEP (curta_web)

Data: 2026-07-12

## Ficheiros alterados

- `src/components/live/useWhepPlayer.ts` — Substituído o `ontrack` que só processava `ev.track.kind === 'video'` por uma lógica que acumula **todas** as tracks recebidas (vídeo + áudio) num `MediaStream` próprio (`remoteStreamRef`), que é anexado ao `video.srcObject`.
- `src/components/live/LivePlayer.tsx` — Adicionado botão de "Ativar som" (ícone `VolumeX`/`Volume2` da lucide-react) sobreposto ao vídeo. O `<video>` mantém `muted` para garantir autoplay; o botão permite ao viewer desmutar explicitamente.

## Opção de desmute escolhida

**A (botão explícito).** Um botão circular com ícone `VolumeX` aparece no canto inferior direito do player enquanto `muted === true`. Ao clicar, faz `videoRef.current.muted = false` e troca para o ícone `Volume2`. O botão fica sempre visível (mostrando o estado actual do mute), permitindo ao utilizador silenciar/ativar som quando quiser.

Razão: é mais explícito que a Opção B (clique em qualquer parte do player), não exige que o utilizador saiba que pode clicar no vídeo, e segue o padrão comum de players de vídeo.

## Teste manual realizado?

Não foi possível correr localmente (backend offline). As alterações foram verificadas estaticamente:
- TypeScript compila sem erros novos (`npx tsc --noEmit` — só restam 4 erros preexistentes em `StatusPage.tsx`).
- O `remoteStreamRef` é resetado para `null` no `cleanup` (linha 87) e no início do `play` (linha 21), não vaza entre sessões.
- O `video.muted` mantém-se `true` no JSX; o desmute é feito exclusivamente pelo `toggleMute` no `onClick` do botão.

## Riscos remanescentes

- **Chrome/Safari autoplay policy**: o atributo `muted` foi mantido no elemento, pelo que o autoplay continua garantido. O som só se ativa com clique explícito do viewer — não há risco de o browser bloquear o vídeo.
- **Apenas o `ontrack` foi alterado no `useWhepPlayer.ts`**: a negociação (offer/answer via `liveService.enviarOfertaWhep`) e o resto do fluxo estão intactos.
- **iOS Safari**: o elemento `<video>` tem `playsInline`, o que permite playback inline. O botão de "Ativar som" requer interação tátil (toque), que conta como gesto de utilizador.
- **Fallback HLS**: quando o WHEP falha (timeout 5s), o `LivePlayer.tsx` cai para hls.js. O hls.js anexa-se ao mesmo `<video>`, que continua `muted` — o botão de som funciona igualmente para o fallback HLS, porque altera o `muted` do elemento, não o fluxo WHEP.
