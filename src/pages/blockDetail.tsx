import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, ExternalLink } from 'lucide-react';
import { fetchBlock } from '../lib/api';
import type { Block } from '../types/database';
import type { BlockGrapheme, BlockSignSlotDetail } from '../../api/lib/types';

type TabType = 'transcription' | 'dates' | 'signs' | 'people';

interface SlotInfo {
  certainty?: string;
  position_in_block?: string | null;
}

const GraphemeRow = memo(({ grapheme, slotInfo }: { grapheme: BlockGrapheme; slotInfo?: SlotInfo }) => (
  <div className="grid grid-cols-[44px_1fr_auto] gap-3 items-center p-3 border border-gray-200 rounded bg-white hover:border-gray-300 transition-colors">
    <div>
      {grapheme.primary_image_url ? (
        <img src={grapheme.primary_image_url} alt={grapheme.graphcode || grapheme.grapheme_code} loading="lazy" className="w-[44px] h-[32px] object-contain rounded border border-gray-200 bg-gray-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <div className="w-[44px] h-[32px] bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[8px] font-mono">img</div>
      )}
    </div>
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-sm font-medium">
        {grapheme.catalog_sign_id ? (
          <Link to={`/sign/${grapheme.catalog_sign_id}`} className="text-blue-600 no-underline hover:underline">
            {grapheme.graphcode || grapheme.grapheme_code}
          </Link>
        ) : (
          <span className="text-gray-700">{grapheme.graphcode || grapheme.grapheme_code}</span>
        )}
        {slotInfo?.certainty === 'uncertain' && <span className="text-amber-600 ml-1 text-xs">?</span>}
      </div>
      {grapheme.syllabic_value && <div className="font-serif italic text-sm">{grapheme.syllabic_value}</div>}
      {grapheme.grapheme_english && grapheme.grapheme_english !== '_' && (
        <div className="text-[11px] text-gray-400">{grapheme.english_translation || grapheme.grapheme_english}</div>
      )}
    </div>
    <div className="flex flex-col items-end gap-1">
      {slotInfo?.position_in_block && slotInfo.position_in_block !== 'eroded' && (
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
          slotInfo.position_in_block === 'main' ? 'bg-gray-50 text-gray-600 border-gray-200' :
          slotInfo.position_in_block === 'prefix' ? 'bg-blue-50 text-blue-600 border-blue-200' :
          slotInfo.position_in_block === 'suffix' ? 'bg-green-50 text-green-600 border-green-200' :
          'bg-gray-50 text-gray-500 border-gray-200'
        }`}>{slotInfo.position_in_block === 'main' ? 'main sign' : slotInfo.position_in_block}</span>
      )}
      {slotInfo?.certainty === 'uncertain' && (
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">uncertain</span>
      )}
    </div>
  </div>
));
GraphemeRow.displayName = 'GraphemeRow';

const ErodedRow = memo(() => (
  <div className="grid grid-cols-[44px_1fr_auto] gap-3 items-center p-3 border border-gray-200 rounded bg-white">
    <div className="w-[44px] h-[32px] bg-red-50 border border-dashed border-red-200 rounded flex items-center justify-center text-red-300 text-[8px] font-mono">---</div>
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-sm text-red-400">000</div>
      <div className="text-[11px] text-gray-400">eroded / undetermined</div>
    </div>
    <div>
      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">eroded</span>
    </div>
  </div>
));
ErodedRow.displayName = 'ErodedRow';

export function BlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [block, setBlock] = useState<Block | null>(null);
  const [graphemes, setGraphemes] = useState<BlockGrapheme[]>([]);
  const [signSlots, setSignSlots] = useState<BlockSignSlotDetail[]>([]);
  const [prevBlock, setPrevBlock] = useState<{ id: number; coordinate: string } | null>(null);
  const [nextBlock, setNextBlock] = useState<{ id: number; coordinate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcription');

  useEffect(() => {
    if (!id) { setError('No ID provided'); setLoading(false); return; }
    const blockId = parseInt(id);
    if (isNaN(blockId)) { setError('Invalid block ID'); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchBlock(blockId, controller.signal)
      .then((data) => {
        setBlock(data.block);
        setGraphemes(data.graphemes);
        setSignSlots(data.signSlots || []);
        setPrevBlock(data.prevBlock || null);
        setNextBlock(data.nextBlock || null);
      })
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load block'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const hasValue = useCallback((val: string | null | undefined) => val && val !== '_' && val !== '-' && val !== 'N/A', []);
  const hasCalendarInfo = useMemo(() => hasValue(block?.event_calendar) || hasValue(block?.event_long_count) || hasValue(block?.event_gregorian) || hasValue(block?.event_260_day) || hasValue(block?.event_365_day), [block, hasValue]);
  const hasTextContent = useMemo(() => hasValue(block?.block_maya1) || hasValue(block?.block_english) || hasValue(block?.block_logosyll) || hasValue(block?.block_hyphenated) || hasValue(block?.transcription_1), [block, hasValue]);
  const hasPeople = useMemo(() => hasValue(block?.person_code) || hasValue(block?.scribe), [block, hasValue]);

  // Parse semantic_context into tags
  const semanticTags = useMemo(() => {
    if (!block?.semantic_context || block.semantic_context === '_') return [];
    return block.semantic_context.split(/[/,;]/).map(s => s.trim()).filter(Boolean);
  }, [block]);

  // Parse person_code and scribe into people list
  const people = useMemo(() => {
    if (!block) return [];
    const list: { name: string; role: string; uncertain: boolean }[] = [];
    if (block.scribe && block.scribe !== '_' && block.scribe !== '-') {
      block.scribe.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(name => {
        const uncertain = name.includes('?');
        list.push({ name: name.replace(/\?/g, '').trim(), role: 'scribe', uncertain });
      });
    }
    if (block.person_code && block.person_code !== '_' && block.person_code !== '-') {
      block.person_code.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(name => {
        if (!list.find(p => p.name === name)) {
          const uncertain = name.includes('?');
          list.push({ name: name.replace(/\?/g, '').trim(), role: 'person', uncertain });
        }
      });
    }
    return list;
  }, [block]);

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
          <Link to="/search" className="text-blue-600 text-sm no-underline hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const tabBtn = (tab: TabType, label: string, count?: number) => (
    <button
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === tab ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {label}
      {count !== undefined && count > 0 && <span className="ml-1.5 font-mono text-xs text-gray-400">{count}</span>}
    </button>
  );

  const metaRow = (label: string, value: string | null | undefined, mono?: boolean) => (
    hasValue(value) && (
      <div className="flex gap-0 text-sm">
        <span className="text-gray-400 min-w-[120px] shrink-0">{label}</span>
        <span className={`text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      </div>
    )
  );

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1100px] mx-auto">
        {/* Breadcrumb with block nav */}
        <div className="flex items-center gap-1 text-sm text-gray-400 mb-6">
          <Link to="/search" className="text-blue-600 no-underline hover:underline">Search</Link>
          <span>&rsaquo;</span>
          <span>Blocks</span>
          <span>&rsaquo;</span>
          {block.artifact_code && (
            <>
              <span className="text-gray-500">{block.artifact_code}</span>
              <span>&rsaquo;</span>
            </>
          )}
          <span className="text-gray-700 font-medium">{block.mhd_block_id}</span>
          {block.coordinate && (
            <span className="ml-3 inline-flex items-center gap-1.5">
              {prevBlock ? (
                <Link to={`/block/${prevBlock.id}`} className="text-blue-500 no-underline hover:text-blue-700" title={`Previous: ${prevBlock.coordinate}`}>&lsaquo;</Link>
              ) : (
                <span className="text-gray-300 select-none">&lsaquo;</span>
              )}
              <span className="font-mono text-xs text-gray-400">{block.coordinate}</span>
              {nextBlock ? (
                <Link to={`/block/${nextBlock.id}`} className="text-blue-500 no-underline hover:text-blue-700" title={`Next: ${nextBlock.coordinate}`}>&rsaquo;</Link>
              ) : (
                <span className="text-gray-300 select-none">&rsaquo;</span>
              )}
            </span>
          )}
        </div>

        {/* Hero: Image + Dual-column metadata */}
        <div className="border border-gray-200 rounded-t-lg overflow-hidden">
          <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-0">
            {/* Image panel */}
            <div className="bg-gray-50 border-r border-gray-200 max-md:border-r-0 max-md:border-b flex flex-col items-center justify-center p-6 gap-3">
              {(block.block_image1_url || block.block_image2_url) ? (
                <img
                  src={block.block_image1_url || block.block_image2_url || ''}
                  alt={block.mhd_block_id}
                  loading="lazy"
                  className="max-h-[200px] max-w-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-[180px] h-[140px] bg-white border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-xs font-mono">
                  no image
                </div>
              )}
              <div className="text-[10px] font-mono text-gray-400 text-center">
                {block.mhd_block_id}
                {block.coordinate && ` \u00B7 ${block.coordinate}`}
              </div>
              <div className="flex gap-2 flex-wrap">
                <a href="https://mayadatabase.org" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 text-[11px] no-underline px-2 py-0.5 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
                  MHD record <ExternalLink size={9} />
                </a>
                {block.block_image2_url && block.block_image1_url && (
                  <a href={block.block_image2_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 text-[11px] no-underline px-2 py-0.5 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
                    More images <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>

            {/* Dual-column metadata */}
            <div className="grid grid-cols-2 max-md:grid-cols-1 gap-6 p-6">
              {/* Left: Location & Object */}
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400 pb-1.5 border-b border-gray-200">
                  Location &amp; Object
                </div>
                {metaRow('Block ID', block.mhd_block_id, true)}
                {metaRow('Coordinate', block.coordinate, true)}
                {hasValue(block.artifact_code) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Artifact</span>
                    <span className="text-gray-900">
                      {block.artifact_code}
                      {block.artifact_name && block.artifact_name !== block.artifact_code && (
                        <span className="text-gray-500"> &mdash; {block.artifact_name.includes(',') ? block.artifact_name.split(',').slice(1).join(',').trim() : block.artifact_name}</span>
                      )}
                    </span>
                  </div>
                )}
                {hasValue(block.site_name) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Site</span>
                    <Link to={`/search?mode=blocks&site=${encodeURIComponent(block.site_name!)}`} className="text-blue-600 no-underline hover:underline">{block.site_name}</Link>
                  </div>
                )}
                {metaRow('Region', block.region)}
                {metaRow('Surface', block.surface_page)}
                {metaRow('Frame', block.orientation_frame)}
                {(hasValue(block.technique) || hasValue(block.material)) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Medium</span>
                    <span className="text-gray-900">{[block.technique, block.material].filter(v => v && v !== '_' && v !== '-').join(' \u2013 ') || '\u2014'}</span>
                  </div>
                )}
              </div>

              {/* Right: Attribution & Semantic */}
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400 pb-1.5 border-b border-gray-200">
                  Attribution &amp; Semantic Context
                </div>
                {hasValue(block.scribe) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Scribe(s)</span>
                    <span className="text-gray-900">{block.scribe}</span>
                  </div>
                )}
                {hasValue(block.person_code) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Person</span>
                    <span className="text-gray-900">{block.person_code}</span>
                  </div>
                )}
                {semanticTags.length > 0 && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Semantic</span>
                    <div className="flex flex-wrap gap-1">
                      {semanticTags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {metaRow('Calendar type', block.event_calendar)}
                {metaRow('Object type', block.artifact_type)}
                {metaRow('Description', block.object_description)}
                {hasValue(block.image_notes) && (
                  <div className="flex gap-0 text-sm">
                    <span className="text-gray-400 min-w-[120px] shrink-0">Image notes</span>
                    <span className="text-gray-500 italic text-xs">{block.image_notes}</span>
                  </div>
                )}
                {/* MHD source ID (numeric suffix of mhd_block_id) */}
                {block.mhd_block_id && block.mhd_block_id.includes('-') && (
                  <div className="flex gap-0 text-sm mt-1">
                    <span className="text-gray-400 min-w-[120px] shrink-0">MHD source ID</span>
                    <span className="text-gray-400 font-mono text-xs">{block.mhd_block_id.split('-').pop()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-x border-gray-200 bg-gray-50 overflow-x-auto px-4">
          {tabBtn('transcription', 'Transcription')}
          {hasCalendarInfo && tabBtn('dates', 'Dates')}
          {tabBtn('signs', 'Signs', signSlots.length || graphemes.length)}
          {hasPeople && tabBtn('people', 'People', people.length)}
        </div>

        {/* Tab Content */}
        <div className="border border-gray-200 rounded-b-lg p-6 min-h-[200px]">

          {/* TRANSCRIPTION TAB */}
          {activeTab === 'transcription' && (
            hasTextContent ? (
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-4">Full block transcription</h3>
                <div className="border border-gray-200 rounded overflow-hidden">
                  {hasValue(block.block_logosyll) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Logosyll.</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.block_logosyll}</div>
                    </div>
                  )}
                  {hasValue(block.block_hyphenated) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Hyphen</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.block_hyphenated}</div>
                    </div>
                  )}
                  {hasValue(block.transcription_1) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Transcr. 1</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.transcription_1}</div>
                    </div>
                  )}
                  {hasValue(block.transcription_2) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Transcr. 2</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.transcription_2}</div>
                    </div>
                  )}
                  {hasValue(block.block_maya1) && !(block.block_maya1 === block.transcription_1) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Maya 1</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.block_maya1}</div>
                    </div>
                  )}
                  {hasValue(block.block_maya2) && !(block.block_maya2 === block.transcription_2) && (
                    <div className="grid grid-cols-[110px_1fr] border-b border-gray-200">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">Maya 2</div>
                      <div className="p-3 font-mono text-sm tracking-wide">{block.block_maya2}</div>
                    </div>
                  )}
                  {hasValue(block.block_english) && (
                    <div className="grid grid-cols-[110px_1fr]">
                      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 p-3 bg-gray-50 border-r border-gray-200 flex items-center">English</div>
                      <div className="p-3 font-serif italic text-sm text-gray-600">&ldquo;{block.block_english}&rdquo;</div>
                    </div>
                  )}
                </div>
                {block.notes && block.notes !== '' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400 block mb-1">Notes</span>
                    <p className="text-sm text-gray-600 m-0 leading-relaxed">{block.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-12">No transcription data available for this block</p>
            )
          )}

          {/* DATES TAB */}
          {activeTab === 'dates' && (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">Two date contexts &mdash; event date vs. object date</h3>
              <p className="text-xs text-gray-400 italic mb-4">
                MHD records may contain event dates (the historical event described) and/or object dates (when the monument was created).
              </p>
              <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
                {/* Event date column */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="text-[10px] font-mono uppercase tracking-wide px-3 py-2 bg-indigo-50 border-b border-gray-200 text-indigo-600">
                    Event date (ev–)
                  </div>
                  <div className="py-2">
                    <DateRow label="Calendar" value={block.event_calendar} />
                    <DateRow label="Long Count" value={block.event_long_count} />
                    <DateRow label="260-day" value={block.event_260_day} />
                    <DateRow label="365-day" value={block.event_365_day} />
                    <DateRow label="Gregorian" value={block.event_gregorian} />
                  </div>
                </div>
                {/* Object date column */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="text-[10px] font-mono uppercase tracking-wide px-3 py-2 bg-green-50 border-b border-gray-200 text-green-700">
                    Object date (obj–)
                  </div>
                  <div className="py-2">
                    {(block as unknown as Record<string, unknown>).object_date_start ? (
                      <>
                        <DateRow label="Long Count" value={(block as unknown as Record<string, unknown>).object_date_lc as string | null} />
                        <DateRow label="260-day" value={(block as unknown as Record<string, unknown>).object_date_260 as string | null} />
                        <DateRow label="365-day" value={(block as unknown as Record<string, unknown>).object_date_365 as string | null} />
                        <DateRow label="Gregorian" value={(block as unknown as Record<string, unknown>).object_date_start as string | null} />
                        {(block as unknown as Record<string, unknown>).object_date_end && (
                          <DateRow label="End date" value={(block as unknown as Record<string, unknown>).object_date_end as string | null} />
                        )}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-300 italic">No separate object date available</div>
                    )}
                  </div>
                </div>
              </div>
              {!(block as unknown as Record<string, unknown>).object_date_start && (
                <p className="text-xs text-gray-400 italic mt-3">
                  Object dates (when the monument was made) are only available for artifacts documented in the TWKM corpus.
                </p>
              )}
            </div>
          )}

          {/* SIGNS TAB */}
          {activeTab === 'signs' && (
            <div>
              {/* Sign sequence strip */}
              {signSlots.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">
                    Sign sequence &mdash; {hasValue(block.block_graphcodes) ? block.block_graphcodes : `${signSlots.length} signs`}
                  </h3>
                  <div className="flex items-center gap-1.5 p-4 bg-white border border-gray-200 rounded flex-wrap">
                    {signSlots.map((slot, i) => (
                      <div key={slot.slot_id} className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-[48px] h-[34px] rounded border flex items-center justify-center ${
                            slot.certainty === 'eroded'
                              ? 'border-red-200 bg-red-50'
                              : slot.certainty === 'uncertain'
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            {slot.image_url ? (
                              <img src={slot.image_url} alt="" className="w-[40px] h-[28px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <span className="text-[8px] font-mono text-gray-300">
                                {slot.certainty === 'eroded' ? '---' : 'img'}
                              </span>
                            )}
                          </div>
                          <span className={`font-mono text-[10px] ${
                            slot.certainty === 'eroded'
                              ? 'text-red-400'
                              : slot.certainty === 'uncertain'
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`}>
                            {slot.catalog_code || slot.raw_code}
                            {slot.certainty === 'uncertain' && '?'}
                          </span>
                        </div>
                        {i < signSlots.length - 1 && (
                          <span className="text-gray-300 text-lg mt-[-14px]">&rsaquo;</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed sign list — merges sign slots with grapheme data */}
              {(signSlots.length > 0 || graphemes.length > 0) && (
                <div>
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">Sign detail</h3>
                  <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                    {signSlots.length > 0 ? (
                      signSlots.map((slot) => {
                        if (slot.certainty === 'eroded' || slot.raw_code === '000') {
                          return <ErodedRow key={slot.slot_id} />;
                        }
                        const matchedGrapheme = graphemes.find(
                          g => (g.graphcode === slot.catalog_code) || (g.graphcode === slot.raw_code)
                        );
                        if (matchedGrapheme) {
                          return <GraphemeRow key={slot.slot_id} grapheme={matchedGrapheme} slotInfo={{ certainty: slot.certainty, position_in_block: slot.position_in_block }} />;
                        }
                        // Slot with no matching grapheme — show raw code
                        return (
                          <div key={slot.slot_id} className="grid grid-cols-[44px_1fr_auto] gap-3 items-center p-3 border border-gray-200 rounded bg-white">
                            <div className="w-[44px] h-[32px] bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[8px] font-mono">img</div>
                            <div className="flex flex-col gap-0.5">
                              <div className={`font-mono text-sm font-medium ${slot.certainty === 'uncertain' ? 'text-amber-600' : 'text-gray-700'}`}>
                                {slot.catalog_code || slot.raw_code}{slot.certainty === 'uncertain' ? '?' : ''}
                              </div>
                              {slot.reading_value && <div className="font-serif italic text-sm">{slot.reading_value}</div>}
                            </div>
                            <div>
                              {slot.certainty === 'uncertain' && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">uncertain</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      graphemes.map((g) => (
                        <GraphemeRow key={g.id} grapheme={g} />
                      ))
                    )}
                  </div>
                </div>
              )}

              {signSlots.length === 0 && graphemes.length === 0 && (
                <p className="text-center text-gray-400 py-12">No sign data available for this block</p>
              )}
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-4">
                Named individuals associated with this block
              </h3>
              {people.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {people.map((p, i) => {
                    const personId = p.role === 'scribe'
                      ? `scribe-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                      : `mhd-${p.name}`;
                    return (
                      <Link key={i} to={`/person/${encodeURIComponent(personId)}`} className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-white hover:border-indigo-300 hover:shadow-sm transition-all">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          p.uncertain ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <User size={12} />
                        </div>
                        <div className="flex-1 text-sm font-medium text-gray-900">
                          {p.uncertain && <span className="text-gray-400">?? </span>}
                          {p.name}
                        </div>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                          p.uncertain
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.role}{p.uncertain ? ' \u00B7 uncertain' : ''}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">No named individuals recorded</p>
              )}
              <p className="text-xs text-gray-400 italic mt-4">
                Attributions from MHD &ldquo;scribe&rdquo; and &ldquo;person_code&rdquo; fields. Uncertain identifications marked.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string | null | undefined }) {
  const hasVal = value && value !== '_' && value !== '-' && value !== 'N/A' && value !== '??';
  return (
    <div className="flex px-3 py-1.5 text-xs hover:bg-gray-50">
      <span className="text-gray-400 min-w-[80px] font-mono text-[11px]">{label}</span>
      {hasVal ? (
        <span className="text-gray-900">{value}</span>
      ) : (
        <span className="text-gray-300 font-mono text-[11px]">{value === '??' ? '??' : '\u2014'}</span>
      )}
    </div>
  );
}
