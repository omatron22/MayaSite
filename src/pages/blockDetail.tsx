import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Calendar, ChevronLeft } from 'lucide-react';
import { fetchBlock } from '../lib/api';
import type { Block } from '../types/database';
import type { BlockGrapheme } from '../../api/lib/types';

const GraphemeItem = memo(({ grapheme }: { grapheme: BlockGrapheme }) => (
  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
    {grapheme.primary_image_url && (
      <div className="w-[50px] h-[50px] bg-white rounded border border-gray-200 flex items-center justify-center shrink-0 p-1">
        <img src={grapheme.primary_image_url} alt={grapheme.graphcode || grapheme.grapheme_code} loading="lazy" width={50} height={50} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
    )}
    <div className="flex flex-col gap-0.5 justify-center flex-1">
      <div className="text-sm font-medium text-gray-900">
        {grapheme.catalog_sign_id ? (
          <Link to={`/sign/${grapheme.catalog_sign_id}`} className="text-blue-600 no-underline hover:underline">
            {grapheme.graphcode || grapheme.grapheme_code}
          </Link>
        ) : (
          grapheme.graphcode || grapheme.grapheme_code
        )}
      </div>
      {grapheme.syllabic_value && <div className="text-xs text-blue-600">{grapheme.syllabic_value}</div>}
      {grapheme.grapheme_english && grapheme.grapheme_english !== '_' && (
        <div className="text-xs text-gray-500 italic">&quot;{grapheme.grapheme_english}&quot;</div>
      )}
    </div>
  </div>
));
GraphemeItem.displayName = 'GraphemeItem';

export function BlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [block, setBlock] = useState<Block | null>(null);
  const [graphemes, setGraphemes] = useState<BlockGrapheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError('No ID provided'); setLoading(false); return; }
    const blockId = parseInt(id);
    if (isNaN(blockId)) { setError('Invalid block ID'); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchBlock(blockId, controller.signal)
      .then((data) => { setBlock(data.block); setGraphemes(data.graphemes); })
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load block'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const hasValue = useCallback((val: string | null | undefined) => val && val !== '_' && val !== '-' && val !== 'N/A', []);
  const hasCalendarInfo = useMemo(() => hasValue(block?.event_calendar) || hasValue(block?.event_long_count), [block, hasValue]);
  const hasTextContent = useMemo(() => hasValue(block?.block_maya1) || hasValue(block?.block_english), [block, hasValue]);
  const hasNotes = useMemo(() => block?.notes && block.notes !== '', [block]);

  if (loading) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-500">Loading block...</p>
        </div>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-gray-600 mb-4">{error || 'Block not found'}</p>

          <Link to="/" className="text-blue-600 text-sm no-underline hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const infoRow = (label: string, value: string | null | undefined) => (
    hasValue(value) && (
      <div className="flex gap-3 py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-gray-500 text-sm min-w-[100px]">{label}</span>
        <span className="text-gray-900 text-sm">{value}</span>
      </div>
    )
  );

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1100px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-blue-600 no-underline text-sm mb-6 hover:underline">
          <ChevronLeft size={14} />
          Back to search
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{block.mhd_block_id}</h1>

        {(block.block_image1_url || block.block_image2_url) && (
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 inline-flex">
              <img
                src={block.block_image1_url || block.block_image2_url || ''}
                alt={block.mhd_block_id}
                loading="lazy"
                className="max-h-[300px] object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1.2fr_1fr] max-md:grid-cols-1 gap-6">
          <div className="flex flex-col gap-4">
            <section className="border border-gray-200 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                <FileText size={14} className="text-gray-400" /> Block Details
              </h3>
              <div className="flex flex-col">
                {infoRow('Block ID', block.mhd_block_id)}
                {infoRow('Artifact', block.artifact_code)}
                {infoRow('Surface/Page', block.surface_page)}
                {infoRow('Frame', block.orientation_frame)}
              </div>
            </section>

            {hasTextContent && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <FileText size={14} className="text-gray-400" /> Text
                </h3>
                <div className="flex flex-col gap-2">
                  {hasValue(block.block_maya1) && <p className="text-sm text-gray-900 m-0">{block.block_maya1}</p>}
                  {hasValue(block.block_maya2) && <p className="text-sm text-gray-600 m-0 italic">{block.block_maya2}</p>}
                  {hasValue(block.block_english) && <p className="text-sm text-gray-500 italic m-0">&quot;{block.block_english}&quot;</p>}
                </div>
              </section>
            )}

            {hasCalendarInfo && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  <Calendar size={14} className="text-gray-400" /> Calendar
                </h3>
                <div className="flex flex-col">
                  {infoRow('Calendar', block.event_calendar)}
                  {infoRow('Long Count', block.event_long_count)}
                  {infoRow('260-day', block.event_260_day)}
                  {infoRow('365-day', block.event_365_day)}
                </div>
              </section>
            )}

            {hasNotes && (
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">Notes</h3>
                <p className="text-sm text-gray-600 m-0 leading-relaxed">{block.notes}</p>
              </section>
            )}
          </div>

          {graphemes.length > 0 && (
            <div>
              <section className="border border-gray-200 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
                  Graphemes ({graphemes.length})
                </h3>
                <div className="grid gap-3 max-h-[600px] overflow-y-auto">
                  {graphemes.map((g) => (
                    <GraphemeItem key={g.id} grapheme={g} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
