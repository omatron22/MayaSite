import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Package, FileText, BookOpen, ChevronLeft } from 'lucide-react';
import { fetchGrapheme } from '../lib/api';
import type { GraphemeDetailResponse } from '../../api/lib/types';

interface CatalogCodeData {
  label: string;
  code: string;
  variant?: string;
}

const CatalogCodeBadge = memo(({ label, code, variant }: CatalogCodeData) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">{label}:</span>
    <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2 py-0.5 rounded">{code}</span>
    {variant && <span className="text-[11px] text-gray-400 italic">var. {variant}</span>}
  </div>
));
CatalogCodeBadge.displayName = 'CatalogCodeBadge';

export function GraphemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [grapheme, setGrapheme] = useState<GraphemeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError('No ID provided'); setLoading(false); return; }
    const gId = parseInt(id);
    if (isNaN(gId)) { setError('Invalid grapheme ID'); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchGrapheme(gId, controller.signal)
      .then((data) => setGrapheme(data))
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load grapheme'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const hasValue = useCallback((val: string | null | undefined) => val && val !== '_' && val !== '-' && val !== 'N/A', []);
  const hasTemporal = useMemo(() => hasValue(grapheme?.event_calendar) || hasValue(grapheme?.event_long_count), [grapheme, hasValue]);
  const hasGeographic = useMemo(() => hasValue(grapheme?.region) || hasValue(grapheme?.site_name), [grapheme, hasValue]);
  const hasBlockContext = useMemo(() => hasValue(grapheme?.block_maya1) || hasValue(grapheme?.block_english), [grapheme, hasValue]);
  const hasMetadata = useMemo(() => hasValue(grapheme?.sign_technique) || hasValue(grapheme?.distribution) || hasValue(grapheme?.picture_description), [grapheme, hasValue]);

  const catalogCodes = useMemo(() => {
    if (!grapheme) return [];
    return [
      hasValue(grapheme.thompson_code) && { label: 'Thompson', code: `T${grapheme.thompson_code}`, variant: grapheme.thompson_variant || undefined },
      hasValue(grapheme.zender_code) && { label: 'Zender', code: grapheme.zender_code! },
      hasValue(grapheme.kettunen_code) && { label: 'Kettunen', code: grapheme.kettunen_code! },
      hasValue(grapheme.gronemeyer_code) && { label: 'Gronemeyer', code: grapheme.gronemeyer_code! },
      grapheme.bonn_sign_number && { label: 'Bonn', code: String(grapheme.bonn_sign_number) },
      hasValue(grapheme.mhd_code_2003) && { label: 'MHD 2003', code: grapheme.mhd_code_2003! },
    ].filter((v): v is CatalogCodeData => Boolean(v));
  }, [grapheme, hasValue]);

  if (loading) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-500">Loading grapheme...</p>
        </div>
      </div>
    );
  }

  if (error || !grapheme) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-gray-600 mb-4">{error || 'Grapheme not found'}</p>
          <Link to="/search" className="text-blue-600 text-sm no-underline hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-500 text-sm min-w-[100px]">{label}</span>
      <span className="text-gray-900 text-sm">{value}</span>
    </div>
  );

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1100px] mx-auto">
        <Link to="/search" className="inline-flex items-center gap-1 text-blue-600 no-underline text-sm mb-6 hover:underline">
          <ChevronLeft size={14} />
          Back to search
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {grapheme.mhd_block_id || 'Unknown Block'} - {grapheme.grapheme_code || grapheme.graphcode}
        </h1>

        <div className="grid grid-cols-[1.2fr_1fr] max-md:grid-cols-1 gap-6">
          <div className="flex flex-col gap-4">
            {hasTemporal && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <Calendar size={14} className="text-gray-400" /> Temporal
                </h3>
                <div className="flex flex-col">
                  {hasValue(grapheme.event_calendar) && infoRow('Calendar', grapheme.event_calendar)}
                  {hasValue(grapheme.event_long_count) && infoRow('Long Count', <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{grapheme.event_long_count}</span>)}
                </div>
              </section>
            )}

            {hasGeographic && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <MapPin size={14} className="text-gray-400" /> Geographic
                </h3>
                <div className="flex flex-col">
                  {hasValue(grapheme.region) && infoRow('Region', grapheme.region)}
                  {hasValue(grapheme.site_name) && infoRow('Site', grapheme.site_name)}
                </div>
              </section>
            )}

            <section className="border border-gray-200 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                <Package size={14} className="text-gray-400" /> Artifact
              </h3>
              <div className="flex flex-col">
                {infoRow('Block ID', grapheme.block_id ? (
                  <Link to={`/block/${grapheme.block_id}`} className="font-mono text-xs bg-gray-100 text-blue-600 px-2 py-0.5 rounded no-underline hover:underline">{grapheme.mhd_block_id || 'N/A'}</Link>
                ) : (
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{grapheme.mhd_block_id || 'N/A'}</span>
                ))}
                {infoRow('Artifact Code', grapheme.artifact_code || 'N/A')}
                {hasValue(grapheme.surface_page) && infoRow('Surface/Page', grapheme.surface_page)}
              </div>
            </section>

            <section className="border border-gray-200 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                <FileText size={14} className="text-gray-400" /> Instance
              </h3>
              <div className="flex flex-col">
                {infoRow('Code', <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{grapheme.grapheme_code || grapheme.graphcode || 'N/A'}</span>)}
                {hasValue(grapheme.grapheme_maya) && infoRow('Maya Text', grapheme.grapheme_maya)}
                {hasValue(grapheme.grapheme_english) && infoRow('Translation', <span className="italic text-gray-600">&quot;{grapheme.grapheme_english}&quot;</span>)}
              </div>
            </section>

            {hasBlockContext && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <BookOpen size={14} className="text-gray-400" /> Block Context
                </h3>
                <div className="flex flex-col gap-2">
                  {hasValue(grapheme.block_maya1) && <p className="text-sm text-gray-900 m-0">{grapheme.block_maya1}</p>}
                  {hasValue(grapheme.block_english) && <p className="text-sm text-gray-500 italic m-0">&quot;{grapheme.block_english}&quot;</p>}
                </div>
              </section>
            )}
          </div>

          {grapheme.catalog_sign_id && (
            <div>
              <section className="border border-gray-200 p-4 rounded-lg sticky top-20">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <BookOpen size={14} className="text-gray-400" /> Catalog Reference
                </h3>

                {grapheme.primary_image_url && (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center justify-center min-h-[160px] mb-4">
                    <img src={grapheme.primary_image_url} alt={grapheme.graphcode || 'Catalog sign'} loading="lazy" width={200} height={200} className="max-w-full max-h-[240px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}

                <div className="text-lg font-semibold text-gray-900 mb-3">{grapheme.graphcode}</div>

                {catalogCodes.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                    {catalogCodes.map((cd) => (
                      <CatalogCodeBadge key={cd.label} label={cd.label} code={cd.code} variant={cd.variant} />
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 py-3 border-y border-gray-200 mb-4">
                  {hasValue(grapheme.syllabic_value) && (
                    <div className="flex gap-3 items-baseline">
                      <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">Syllabic:</span>
                      <span className="text-sm text-blue-600">{grapheme.syllabic_value}</span>
                    </div>
                  )}
                  {hasValue(grapheme.logographic_value) && (
                    <div className="flex gap-3 items-baseline">
                      <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">Logographic:</span>
                      <span className="text-sm text-gray-700">{grapheme.logographic_value}</span>
                    </div>
                  )}
                  {hasValue(grapheme.logographic_cvc) && (
                    <div className="flex gap-3 items-baseline">
                      <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">CVC:</span>
                      <span className="text-sm text-gray-700 font-mono">{grapheme.logographic_cvc}</span>
                    </div>
                  )}
                  {hasValue(grapheme.english_translation) && (
                    <div className="flex gap-3 items-baseline">
                      <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">Translation:</span>
                      <span className="text-sm text-gray-600 italic">&quot;{grapheme.english_translation}&quot;</span>
                    </div>
                  )}
                  {hasValue(grapheme.word_class) && (
                    <div className="flex gap-3 items-baseline">
                      <span className="text-xs text-gray-500 uppercase tracking-wide min-w-[80px]">Word Class:</span>
                      <span className="text-xs text-gray-500 uppercase">{grapheme.word_class}</span>
                    </div>
                  )}
                </div>

                {hasMetadata && (
                  <div className="flex flex-col gap-1.5 text-sm mb-4">
                    {hasValue(grapheme.sign_technique) && (
                      <div className="flex gap-2"><span className="text-gray-500 font-medium min-w-[80px]">Technique:</span><span className="text-gray-700">{grapheme.sign_technique}</span></div>
                    )}
                    {hasValue(grapheme.distribution) && (
                      <div className="flex gap-2"><span className="text-gray-500 font-medium min-w-[80px]">Distribution:</span><span className="text-gray-700">{grapheme.distribution}</span></div>
                    )}
                    {hasValue(grapheme.picture_description) && (
                      <div className="flex flex-col gap-1"><span className="text-gray-500 font-medium">Description:</span><span className="text-gray-700">{grapheme.picture_description}</span></div>
                    )}
                  </div>
                )}

                <Link
                  to={`/sign/${grapheme.catalog_sign_id}`}
                  className="text-blue-600 text-sm hover:underline no-underline"
                >
                  View Full Catalog Entry &rarr;
                </Link>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
