import { useCallback, useRef } from 'react';
import { liveService } from '@/api/live-service';

const WHEP_TIMEOUT_MS = 5000;
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useWhepPlayer() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const locRef = useRef<string>('');

  const play = useCallback(async (
    liveId: string,
    video: HTMLVideoElement,
    onFallback: () => void,
  ) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    locRef.current = '';

    /** Se passarem 5s sem track remoto → fallback HLS. */
    let gotTrack = false;
    pc.ontrack = (ev) => {
      gotTrack = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (ev.track.kind === 'video') {
        video.srcObject = ev.streams[0] ?? null;
        video.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        cleanup();
        onFallback();
      }
    };

    timeoutRef.current = setTimeout(() => {
      if (!gotTrack) {
        cleanup();
        onFallback();
      }
    }, WHEP_TIMEOUT_MS);

    try {
      const transceiver = pc.addTransceiver('video', { direction: 'recvonly' });
      transceiver.setCodecPreferences(
        RTCRtpReceiver.getCapabilities('video')?.codecs.filter(
          (c) => c.mimeType === 'video/H264' || c.mimeType === 'video/VP8' || c.mimeType === 'video/VP9',
        ) ?? [],
      );

      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      if (!offer.sdp) throw new Error('SDP offer vazio');

      const { sdp: answerSdp, location } = await liveService.enviarOfertaWhep(liveId, offer.sdp);
      locRef.current = location;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch {
      cleanup();
      onFallback();
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const terminate = useCallback(async (liveId: string) => {
    cleanup();
    try {
      await liveService.terminarWhep(liveId, locRef.current);
    } catch { /* ignore */ }
  }, [cleanup]);

  return { play, cleanup, terminate };
}
