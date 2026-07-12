import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Video, Image, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { uploadService, UploadProgress } from '@/api/upload-service';
import { catalogService } from '@/api/catalog-service';
import { UploadStatsModal } from '@/components/ui/UploadStatsModal';
import { Categoria, TagOut, CurtaOut } from '@/types';

const STEPS = ['Vídeo', 'Capa', 'Metadados', 'Revisão'];

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [tags, setTags] = useState<TagOut[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [publishedFilm, setPublishedFilm] = useState<CurtaOut | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    catalogService.getCategories().then(setCategories).catch(() => {});
    catalogService.getTags().then(setTags).catch(() => {});
  }, []);

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      if (!titulo) setTitulo(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }
  }, [titulo]);

  const handleCapaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapaFile(file);
      setCapaPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!videoFile || !titulo.trim()) return;
    setIsUploading(true);
    setIsProcessing(false);
    setUploadProgress(0);
    setError('');
    try {
      const film = await uploadService.uploadFilm(
        videoFile, capaFile,
        { titulo: titulo.trim(), descricao, categoriaId, tagIds: selectedTags },
        (p: UploadProgress) => setUploadProgress(p.percentage),
        (elapsed) => { setIsProcessing(true); setIsUploading(false); setProcessingElapsed(elapsed); },
      );
      setPublishedFilm(film);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload.');
      setIsUploading(false);
      setIsProcessing(false);
    }
  }, [videoFile, capaFile, titulo, descricao, categoriaId, selectedTags]);

  const handleContinue = useCallback(() => {
    if (publishedFilm) navigate(`/filme/${publishedFilm.id}`);
    else navigate('/');
  }, [publishedFilm, navigate]);

  if (publishedFilm) {
    return <UploadStatsModal mediaAssets={publishedFilm.media_assets} onContinue={handleContinue} />;
  }

  if (success) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Upload de Vídeo</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-red text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-brand-red' : 'text-neutral-500'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Video */}
      {step === 0 && (
        <div className="space-y-4">
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
          {videoPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video src={videoPreview} className="w-full h-full object-contain" controls />
              <button onClick={() => { setVideoFile(null); setVideoPreview(''); }}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                {(videoFile!.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          ) : (
            <button onClick={() => videoInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-brand-red transition-colors text-neutral-500">
              <Video className="w-12 h-12" />
              <div className="text-center">
                <p className="font-semibold">Selecionar vídeo</p>
                <p className="text-sm">MP4, MOV ou WebM (máx. 4 GB)</p>
              </div>
            </button>
          )}
          <button onClick={() => videoFile && setStep(1)} disabled={!videoFile}
            className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
            Próximo
          </button>
        </div>
      )}

      {/* Step 1: Cover */}
      {step === 1 && (
        <div className="space-y-4">
          <input ref={capaInputRef} type="file" accept="image/*" className="hidden" onChange={handleCapaSelect} />
          {capaPreview ? (
            <div className="relative rounded-xl overflow-hidden aspect-video">
              <img src={capaPreview} className="w-full h-full object-cover" />
              <button onClick={() => { setCapaFile(null); setCapaPreview(''); }}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => capaInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-brand-red transition-colors text-neutral-500">
              <Image className="w-12 h-12" />
              <div className="text-center">
                <p className="font-semibold">Selecionar capa</p>
                <p className="text-sm">JPG ou PNG (16:9 recomendado)</p>
              </div>
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl font-semibold">Voltar</button>
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark">
              {capaFile ? 'Próximo' : 'Pular'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Metadata */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome do curta"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Sinopse do curta..."
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm">
              <option value="">Selecionar...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const sel = selectedTags.includes(tag.id);
                  return (
                    <button key={tag.id} onClick={() => setSelectedTags((p) => sel ? p.filter((t) => t !== tag.id) : [...p, tag.id])}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${sel ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
                      {tag.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl font-semibold">Voltar</button>
            <button onClick={() => titulo.trim() && setStep(3)} disabled={!titulo.trim()}
              className="flex-1 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">Próximo</button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {capaPreview && <img src={capaPreview} className="w-24 h-14 object-cover rounded-lg" />}
              <div>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="text-xs text-neutral-500 truncate max-w-xs">{videoFile?.name}</p>
              </div>
            </div>
            {descricao && <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{descricao}</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {(isUploading || isProcessing) && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{isProcessing ? `A processar vídeo... (${processingElapsed}s)` : 'A carregar...'}</span>
                <span className="font-semibold">{isProcessing ? '⏳' : `${uploadProgress}%`}</span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: isProcessing ? '100%' : `${uploadProgress}%` }} />
              </div>
              {isProcessing && (
                <p className="text-xs text-neutral-400 text-center">
                  O processamento inclui compressão, thumbnail e streaming HLS. Pode demorar alguns minutos.
                </p>
              )}
            </div>
          )}

          {error && !isUploading && !isProcessing && (
            <button onClick={() => navigate('/')} className="w-full py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl font-semibold text-sm">
              Voltar ao início
            </button>
          )}

          {!isUploading && !isProcessing && (
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl font-semibold">Voltar</button>
              <button onClick={handleUpload} disabled={!videoFile || !titulo.trim()}
                className="flex-1 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Publicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
