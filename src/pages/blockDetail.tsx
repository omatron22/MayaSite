import { useEffect, useState, useCallback, useMemo } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { useParams, Link } from 'react-router-dom';
import { fetchBlock } from '../lib/api';
import type { Block } from '../types/database';
import type { BlockGrapheme, BlockSignSlotDetail } from '../../api/lib/types';

type TabType = 'information' | 'transcription' | 'dates' | 'signs' | 'people';

export function BlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [block, setBlock] = useState<Block | null>(null);
  const [graphemes, setGraphemes] = useState<BlockGrapheme[]>([]);
  const [signSlots, setSignSlots] = useState<BlockSignSlotDetail[]>([]);
  const [prevBlock, setPrevBlock] = useState<{ id: number; coordinate: string } | null>(null);
  const [nextBlock, setNextBlock] = useState<{ id: number; coordinate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('information');

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
  const hasTextContent = useMemo(() => hasValue(block?.transcription_1) || hasValue(block?.block_english) || hasValue(block?.transcription_logosyll) || hasValue(block?.transcription_hyphen), [block, hasValue]);
  const hasPeople = useMemo(() => hasValue(block?.person_code) || hasValue(block?.scribe), [block, hasValue]);

  const semanticTags = useMemo(() => {
    if (!block?.semantic_context || block.semantic_context === '_') return [];
    return block.semantic_context.split(/[/,;]/).map(s => s.trim()).filter(Boolean);
  }, [block]);

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

  if (error) {
    return (
      <div className="max-w-[80ch] mx-auto px-4 py-4">
        <p className="text-sm">{error}</p>
        <Link to="/search" className="text-xs underline hover:no-underline">Back to search</Link>
      </div>
    );
  }

  if (loading || !block) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ProgressBarLoader />
      </div>
    );
  }

  const tabLabel = (tab: TabType, label: string, count?: number) => {
    const isActive = activeTab === tab;
    const text = count !== undefined ? `${label} ${count}` : label;
    return (
      <td className="px-3 py-1 cursor-pointer" onClick={() => setActiveTab(tab)}>
        <span className="text-sm inline-grid">
          <span className="invisible col-start-1 row-start-1 font-[800]">[{text}]</span>
          <span className="col-start-1 row-start-1">
            {isActive ? <strong>[{text}]</strong> : text}
          </span>
        </span>
      </td>
    );
  };

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs">
                <div className="flex justify-between items-center">
                  <span>
                    <Link to="/search" className="underline hover:no-underline font-normal">Search</Link>
                    {' > '}
                    <Link to="/search?mode=blocks" className="underline hover:no-underline font-normal">Blocks</Link>
                    {' > '}
                    <span className="font-[800]">{block.mhd_block_id}</span>
                  </span>
                  <span className="font-normal whitespace-nowrap">
                    {prevBlock ? (
                      <Link to={`/block/${prevBlock.id}`} className="no-underline" title={prevBlock.coordinate}>&lsaquo;</Link>
                    ) : (
                      <span className="select-none">&lsaquo;</span>
                    )}
                    {block.coordinate && <> {block.coordinate} </>}
                    {nextBlock ? (
                      <Link to={`/block/${nextBlock.id}`} className="no-underline" title={nextBlock.coordinate}>&rsaquo;</Link>
                    ) : (
                      <span className="select-none">&rsaquo;</span>
                    )}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-4 text-center">
                {(block.block_image1_url || block.block_image2_url) ? (
                  <img
                    src={block.block_image1_url || block.block_image2_url || ''}
                    alt={block.mhd_block_id}
                    loading="lazy"
                    className="max-h-[200px] object-contain inline-block"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-xs italic">no image</span>
                )}
                {hasValue(block.block_english) && <div className="text-xs mt-2">"{block.block_english}"</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tabs */}
        <table className="w-full">
          <tbody>
            <tr>
              {tabLabel('information', 'Information')}
              {hasTextContent && tabLabel('transcription', 'Transcription')}
              {hasCalendarInfo && tabLabel('dates', 'Dates')}
              {tabLabel('signs', 'Signs', signSlots.length || graphemes.length)}
              {hasPeople && tabLabel('people', 'People', people.length)}
            </tr>
          </tbody>
        </table>

        {/* INFORMATION */}
        {activeTab === 'information' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Field</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-1 text-xs font-[800]">Block ID</td><td className="px-3 py-1 text-xs">{block.mhd_block_id}</td></tr>
              {hasValue(block.coordinate) && <tr><td className="px-3 py-1 text-xs font-[800]">Coordinate</td><td className="px-3 py-1 text-xs">{block.coordinate}</td></tr>}
              {hasValue(block.artifact_code) && (
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Artifact</td>
                  <td className="px-3 py-1 text-xs">
                    {block.artifact_code}
                    {block.artifact_name && block.artifact_name !== block.artifact_code && (
                      <span> — {block.artifact_name.includes(',') ? block.artifact_name.split(',').slice(1).join(',').trim() : block.artifact_name}</span>
                    )}
                  </td>
                </tr>
              )}
              {hasValue(block.site_name) && (
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Site</td>
                  <td className="px-3 py-1 text-xs">
                    <Link to={`/search?mode=blocks&sites=${encodeURIComponent(block.site_name!)}`} className="underline hover:no-underline">{block.site_name}</Link>
                  </td>
                </tr>
              )}
              {hasValue(block.region) && <tr><td className="px-3 py-1 text-xs font-[800]">Region</td><td className="px-3 py-1 text-xs">{block.region}</td></tr>}
              {hasValue(block.surface_page) && <tr><td className="px-3 py-1 text-xs font-[800]">Surface</td><td className="px-3 py-1 text-xs">{block.surface_page}</td></tr>}
              {hasValue(block.orientation_frame) && <tr><td className="px-3 py-1 text-xs font-[800]">Frame</td><td className="px-3 py-1 text-xs">{block.orientation_frame}</td></tr>}
              {(hasValue(block.technique) || hasValue(block.material)) && (
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Medium</td>
                  <td className="px-3 py-1 text-xs">{[block.technique, block.material].filter(v => v && v !== '_' && v !== '-').join(' — ') || '—'}</td>
                </tr>
              )}
              {hasValue(block.artifact_type) && <tr><td className="px-3 py-1 text-xs font-[800]">Object type</td><td className="px-3 py-1 text-xs">{block.artifact_type}</td></tr>}
              {hasValue(block.object_description) && <tr><td className="px-3 py-1 text-xs font-[800]">Description</td><td className="px-3 py-1 text-xs">{block.object_description}</td></tr>}
              {semanticTags.length > 0 && (
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Semantic</td>
                  <td className="px-3 py-1 text-xs">{semanticTags.join(', ')}</td>
                </tr>
              )}
              {hasValue(block.event_calendar) && <tr><td className="px-3 py-1 text-xs font-[800]">Calendar type</td><td className="px-3 py-1 text-xs">{block.event_calendar}</td></tr>}
              {hasValue(block.image_notes) && <tr><td className="px-3 py-1 text-xs font-[800]">Image notes</td><td className="px-3 py-1 text-xs">{block.image_notes}</td></tr>}
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Sources</td>
                <td className="px-3 py-1 text-xs">
                  <a href="https://mayadatabase.org" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">MHD</a>
                  {block.block_image2_url && block.block_image1_url && (
                    <>{' · '}<a href={block.block_image2_url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">More images</a></>
                  )}
                </td>
              </tr>
              {block.notes && block.notes !== '' && <tr><td className="px-3 py-1 text-xs font-[800]">Notes</td><td className="px-3 py-1 text-xs">{block.notes}</td></tr>}
            </tbody>
          </table>
        )}

        {/* TRANSCRIPTION */}
        {activeTab === 'transcription' && (
          hasTextContent ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Type</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
                </tr>
              </thead>
              <tbody>
                {hasValue(block.transcription_logosyll) && <tr><td className="px-3 py-1 text-xs font-[800]">Logosyll.</td><td className="px-3 py-1 text-xs">{block.transcription_logosyll}</td></tr>}
                {hasValue(block.transcription_hyphen) && <tr><td className="px-3 py-1 text-xs font-[800]">Hyphen</td><td className="px-3 py-1 text-xs">{block.transcription_hyphen}</td></tr>}
                {hasValue(block.transcription_1) && <tr><td className="px-3 py-1 text-xs font-[800]">Transcr. 1</td><td className="px-3 py-1 text-xs">{block.transcription_1}</td></tr>}
                {hasValue(block.transcription_2) && <tr><td className="px-3 py-1 text-xs font-[800]">Transcr. 2</td><td className="px-3 py-1 text-xs">{block.transcription_2}</td></tr>}
                {hasValue(block.block_english) && <tr><td className="px-3 py-1 text-xs font-[800]">English</td><td className="px-3 py-1 text-xs">"{block.block_english}"</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No transcription data available</td></tr></tbody></table>
          )
        )}

        {/* DATES */}
        {activeTab === 'dates' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Field</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              {hasValue(block.event_calendar) && <tr><td className="px-3 py-1 text-xs font-[800]">Calendar</td><td className="px-3 py-1 text-xs">{block.event_calendar}</td></tr>}
              {hasValue(block.event_long_count) && <tr><td className="px-3 py-1 text-xs font-[800]">Long Count</td><td className="px-3 py-1 text-xs">{block.event_long_count}</td></tr>}
              {hasValue(block.event_260_day) && <tr><td className="px-3 py-1 text-xs font-[800]">260-day</td><td className="px-3 py-1 text-xs">{block.event_260_day}</td></tr>}
              {hasValue(block.event_365_day) && <tr><td className="px-3 py-1 text-xs font-[800]">365-day</td><td className="px-3 py-1 text-xs">{block.event_365_day}</td></tr>}
              {hasValue(block.event_gregorian) && <tr><td className="px-3 py-1 text-xs font-[800]">Gregorian</td><td className="px-3 py-1 text-xs">{block.event_gregorian}</td></tr>}
            </tbody>
          </table>
        )}

        {/* SIGNS */}
        {activeTab === 'signs' && (
          (signSlots.length > 0 || graphemes.length > 0) ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Code</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Reading</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Position</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Certainty</th>
                </tr>
              </thead>
              <tbody>
                {signSlots.length > 0 ? (
                  signSlots.map((slot) => (
                    <tr key={slot.slot_id}>
                      <td className="px-3 py-1 text-xs font-[800]">
                        {slot.certainty === 'eroded' || slot.raw_code === '000' ? (
                          <span>000</span>
                        ) : slot.entry_id ? (
                          <Link to={`/entry/${slot.entry_id}`} className="underline hover:no-underline">
                            {slot.catalog_code || slot.raw_code}
                          </Link>
                        ) : (
                          <span>{slot.catalog_code || slot.raw_code}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-xs">
                        {slot.certainty === 'eroded' ? 'eroded / undetermined' : slot.reading_value || '-'}
                      </td>
                      <td className="px-3 py-1 text-xs">
                        {slot.position_in_block && slot.position_in_block !== 'eroded' ? slot.position_in_block : '-'}
                      </td>
                      <td className="px-3 py-1 text-xs">
                        {slot.certainty === 'eroded' ? 'eroded' : slot.certainty === 'uncertain' ? 'uncertain' : 'certain'}
                      </td>
                    </tr>
                  ))
                ) : (
                  graphemes.map((g) => (
                    <tr key={g.id}>
                      <td className="px-3 py-1 text-xs font-[800]">
                        {g.catalog_sign_id ? (
                          <Link to={`/sign/${g.catalog_sign_id}`} className="underline hover:no-underline">
                            {g.graphcode || g.grapheme_code}
                          </Link>
                        ) : (
                          <span>{g.graphcode || g.grapheme_code}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-xs">{g.syllabic_value || '-'}</td>
                      <td className="px-3 py-1 text-xs">-</td>
                      <td className="px-3 py-1 text-xs">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No sign data available</td></tr></tbody></table>
          )
        )}

        {/* PEOPLE */}
        {activeTab === 'people' && (
          people.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Name</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Role</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Certainty</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1 text-xs font-[800]">{p.name}</td>
                    <td className="px-3 py-1 text-xs">{p.role}</td>
                    <td className="px-3 py-1 text-xs">{p.uncertain ? 'uncertain' : 'certain'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No named individuals recorded</td></tr></tbody></table>
          )
        )}

      </div>
    </div>
  );
}
