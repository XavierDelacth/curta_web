import { MediaAssetOut } from '@/types';
import { CheckCircle, X } from 'lucide-react';

function formatBytes(b: number | null): string {
  if (b == null || b === 0) return '—';
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(b / 1024)} KB`;
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms >= 60000) {
    const min = Math.floor(ms / 60000);
    const sec = Math.round((ms % 60000) / 1000);
    return `${min}m ${sec}s`;
  }
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function ssimLabel(ssim: number | null): { label: string; color: string } {
  if (ssim == null) return { label: 'N/D', color: '#888' };
  if (ssim >= 0.95) return { label: 'Excelente', color: '#22c55e' };
  if (ssim >= 0.90) return { label: 'Boa', color: '#84cc16' };
  if (ssim >= 0.80) return { label: 'Aceitável', color: '#eab308' };
  return { label: 'Baixa', color: '#ef4444' };
}

interface UploadStatsModalProps {
  mediaAssets: MediaAssetOut[];
  onContinue: () => void;
}

export function UploadStatsModal({ mediaAssets, onContinue }: UploadStatsModalProps) {
  const video = mediaAssets.find((a) => a.tipo === 'video') ?? mediaAssets[0] ?? null;

  const originalSize = video?.tamanho_original ?? null;
  const compressedSize = video?.tamanho_comprimido ?? null;
  const compressionRatio = video?.taxa_compressao ?? null;
  const processingMs = video?.tempo_processamento_ms ?? null;
  const ssim = video?.qualidade_ssim ?? null;

  const { label: ssimText, color: ssimColor } = ssimLabel(ssim);

  const isStreamCopy = compressionRatio != null && compressionRatio <= 0;

  const processingTime = formatMs(processingMs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onContinue}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">Processamento concluído</h2>
          </div>
          <button onClick={onContinue} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-700" />

        <div className="space-y-3">
          <StatRow label="Tamanho original" value={formatBytes(originalSize)} />
          <StatRow label="Tamanho final" value={formatBytes(compressedSize)} />
          {isStreamCopy ? (
            <StatRow
              label="Compressão"
              value="Stream-copy (já comprimido)"
              valueColor="#22c55e"
            />
          ) : (
            <StatRow
              label="Taxa de compressão"
              value={compressionRatio != null ? `${compressionRatio.toFixed(1)}%` : '—'}
            />
          )}
          <StatRow
            label="Qualidade percebida"
            value={ssim != null ? `${ssimText} (SSIM: ${ssim.toFixed(2)})` : 'N/D'}
            valueColor={ssimColor}
          />
          <StatRow label="Tempo total" value={processingTime} />
        </div>

        <hr className="border-neutral-200 dark:border-neutral-700" />

        <button
          onClick={onContinue}
          className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark transition-colors"
        >
          Ver vídeo
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500 dark:text-neutral-400 flex-1">{label}</span>
      <span className="text-sm font-semibold text-right" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
