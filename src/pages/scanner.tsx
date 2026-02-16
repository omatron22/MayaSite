import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { runInference, lookupSigns } from '../lib/api';
import type { InferencePrediction, SignLookupEntry } from '../../api/lib/types';

const BOX_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function ScannerPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<InferencePrediction[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [signMap, setSignMap] = useState<Record<string, SignLookupEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setError(null);
    setPredictions([]);
    setSignMap({});
    setImageSize(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImageDataUrl(dataUrl);

      const base64 = dataUrl.split(',')[1];

      setLoading(true);
      try {
        const result = await runInference(base64);
        setPredictions(result.predictions);
        setImageSize(result.image);

        const classes = [...new Set(result.predictions.map(p => p.class))];
        if (classes.length > 0) {
          try {
            const lookup = await lookupSigns(classes);
            setSignMap(lookup.signs);
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Inference failed');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const reset = () => {
    setImageDataUrl(null);
    setPredictions([]);
    setSignMap({});
    setImageSize(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-md:p-4">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Glyph Scanner</h1>
        <p className="text-gray-500 text-sm mb-6">Upload an image to detect and identify Maya hieroglyphs</p>

        {!imageDataUrl ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 max-md:p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Upload size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-700 font-medium mb-1">Drop an image here or click to upload</p>
            <p className="text-gray-400 text-sm">Supports JPG, PNG, WebP</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-gray-400" />
                  <span className="text-gray-900 font-medium text-sm">
                    {loading ? 'Analyzing...' : `${predictions.length} glyph${predictions.length !== 1 ? 's' : ''} detected`}
                  </span>
                  {loading && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                </div>
                <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="relative inline-block w-full">
                <img ref={imgRef} src={imageDataUrl} alt="Uploaded" className="w-full rounded" />
                {imageSize && predictions.map((p, i) => {
                  const color = BOX_COLORS[i % BOX_COLORS.length];
                  const left = ((p.x - p.width / 2) / imageSize.width) * 100;
                  const top = ((p.y - p.height / 2) / imageSize.height) * 100;
                  const width = (p.width / imageSize.width) * 100;
                  const height = (p.height / imageSize.height) * 100;
                  return (
                    <div key={i} className="absolute pointer-events-none" style={{
                      left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
                      border: `2px solid ${color}`, backgroundColor: `${color}20`,
                    }}>
                      <span className="absolute -top-5 left-0 text-[10px] font-bold px-1 rounded whitespace-nowrap" style={{ backgroundColor: color, color: '#fff' }}>
                        {p.class} {Math.round(p.confidence * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {predictions.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Detected Glyphs</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {predictions.map((p, i) => {
                    const matched = signMap[p.class];
                    const color = BOX_COLORS[i % BOX_COLORS.length];
                    return (
                      <div key={i} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 font-medium text-sm truncate">{p.class}</div>
                          <div className="text-gray-400 text-xs">{Math.round(p.confidence * 100)}%</div>
                        </div>
                        {matched && (
                          <Link to={`/sign/${matched.id}`} className="text-blue-600 text-xs no-underline hover:underline shrink-0">View</Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">{error}</div>
        )}
      </div>
    </div>
  );
}
