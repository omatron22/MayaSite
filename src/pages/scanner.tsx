import { useState, useRef, useCallback } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { Link } from 'react-router-dom';

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
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Glyph Scanner</th>
              {imageDataUrl && (
                <th className="px-3 py-1 text-right">
                  <button onClick={reset} className="text-xs cursor-pointer underline hover:no-underline">
                    Reset
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-1 text-xs" colSpan={2}>
                Upload a photo of a Maya inscription to automatically detect and identify hieroglyphs using machine learning.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Upload area */}
        {!imageDataUrl ? (
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed p-12 max-md:p-8 text-center cursor-pointer ${
                      dragOver ? 'border-black bg-gray-50' : 'border-gray-400 hover:border-black'
                    }`}
                  >
                    <p className="text-sm font-[800] mb-1">Drop an image here or click to upload</p>
                    <p className="text-xs">Supports JPG, PNG, WebP</p>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <>
            {/* Image + bounding boxes */}
            <table className="w-auto">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">
                    {loading ? (
                      <span className="flex items-center gap-2">Analyzing <ProgressBarLoader /></span>
                    ) : (
                      `${predictions.length} glyph${predictions.length !== 1 ? 's' : ''} detected`
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-1">
                    <div className="relative inline-block w-full">
                      <img ref={imgRef} src={imageDataUrl} alt="Uploaded" className="w-full" />
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
                            <span className="absolute -top-5 left-0 text-[10px] font-[800] px-1 whitespace-nowrap" style={{ backgroundColor: color, color: '#fff' }}>
                              {p.class} {Math.round(p.confidence * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Results table */}
            {predictions.length > 0 && (
              <table className="w-auto">
                <thead>
                  <tr>
                    <th className="px-3 py-1 text-left text-xs uppercase"></th>
                    <th className="px-3 py-1 text-left text-xs uppercase">Code</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Confidence</th>
                    <th className="px-3 py-1 text-right text-xs uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, i) => {
                    const matched = signMap[p.class];
                    const color = BOX_COLORS[i % BOX_COLORS.length];
                    return (
                      <tr key={i}>
                        <td className="px-3 py-1">
                          <div className="w-3 h-3" style={{ backgroundColor: color }} />
                        </td>
                        <td className="px-3 py-1 text-sm font-[800]">{p.class}</td>
                        <td className="px-3 py-1 text-sm text-right">{Math.round(p.confidence * 100)}%</td>
                        <td className="px-3 py-1 text-right">
                          {matched && (
                            <Link to={`/sign/${matched.id}`} className="text-xs underline hover:no-underline">
                              view
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {error && (
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-xs">{error}</td>
              </tr>
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
