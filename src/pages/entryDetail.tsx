import { useEffect, useState, useMemo } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { useParams, Link } from 'react-router-dom';

interface EntryData {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  parent_entry: string | null;
  variant_code: string | null;
  reading_value: string | null;
  reading_type: string | null;
  gloss_english: string | null;
  gloss_mayan: string | null;
  part_of_speech: string[] | null;
  confidence_level: number | null;
  function_variant: string | null;
  image_url: string | null;
  source_url: string | null;
  notes: string | null;
  legacy_catalog_sign_id: number | null;
}

interface CrossRef {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  reading_value: string | null;
  gloss_english: string | null;
  confidence_level: number | null;
  entry_image_url: string | null;
  correspondence: string;
  asserted_by: string | null;
}

interface GraphVariant {
  graph_id: string;
  variant_suffix: string | null;
  variant_type_label: string | null;
  image_url: string | null;
  iconographic_tags: string[] | null;
  notes: string | null;
  medium: string | null;
}

interface Attestation {
  id: number;
  block_id: number | null;
  grapheme_code: string;
  block_english: string | null;
  transcription_1: string | null;
  transcription_logosyll: string | null;
  artifact_code: string | null;
  event_calendar: string | null;
  event_long_count: string | null;
  event_gregorian: string | null;
  site_name: string | null;
  region: string | null;
  semantic_context: string | null;
  mhd_block_id: string | null;
  coordinate: string | null;
  surface_page: string | null;
  orientation_frame: string | null;
  block_img: string | null;
}

type TabType = 'information' | 'crossrefs' | 'variants' | 'attestations';

async function fetchEntryDetail(entryId: string, signal?: AbortSignal): Promise<{ entry: EntryData; crossRefs: CrossRef[]; graphs: GraphVariant[]; graphemes: Attestation[] }> {
  const res = await fetch(`/api/search?mode=entry_detail&entryId=${encodeURIComponent(entryId)}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch entry');
  return res.json();
}

export function EntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([]);
  const [graphs, setGraphs] = useState<GraphVariant[]>([]);
  const [graphemes, setGraphemes] = useState<Attestation[]>([]);
  const [prevEntry, setPrevEntry] = useState<{ entry_id: string; code: string } | null>(null);
  const [nextEntry, setNextEntry] = useState<{ entry_id: string; code: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('information');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) { setError('No entry ID provided'); setLoading(false); return; }
    if (/^\d+$/.test(entryId)) {
      window.location.replace(`/sign/${entryId}`);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchEntryDetail(entryId, controller.signal)
      .then(data => {
        setEntry(data.entry);
        setCrossRefs(data.crossRefs);
        setGraphs(data.graphs);
        setGraphemes(data.graphemes || []);
        setPrevEntry((data as unknown as { prevEntry?: { entry_id: string; code: string } }).prevEntry || null);
        setNextEntry((data as unknown as { nextEntry?: { entry_id: string; code: string } }).nextEntry || null);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load entry');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [entryId]);

  const catalogCount = useMemo(() => new Set(crossRefs.map(r => r.catalog)).size, [crossRefs]);

  if (error) {
    return (
      <div className="max-w-[80ch] mx-auto px-4 py-4">
        <p className="text-sm">{error}</p>
        <Link to="/search?mode=concordance" className="text-xs underline hover:no-underline">Back to concordance</Link>
      </div>
    );
  }

  if (loading || !entry) {
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
                    <Link to="/search?mode=concordance" className="underline hover:no-underline font-normal">Concordance</Link>
                    {' > '}
                    <span className="font-[800]">{entry.catalog_code}</span>
                  </span>
                  <span className="font-normal whitespace-nowrap">
                    {prevEntry ? (
                      <Link to={`/entry/${prevEntry.entry_id}`} className="no-underline" title={prevEntry.code}>&lsaquo;</Link>
                    ) : (
                      <span className="select-none">&lsaquo;</span>
                    )}
                    {' '}
                    {nextEntry ? (
                      <Link to={`/entry/${nextEntry.entry_id}`} className="no-underline" title={nextEntry.code}>&rsaquo;</Link>
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
                {entry.image_url ? (
                  <img src={entry.image_url} alt={entry.catalog_code} className="max-h-[200px] object-contain inline-block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-xs italic">no image</span>
                )}
                {entry.gloss_english && <div className="text-xs mt-2">"{entry.gloss_english}"</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tabs */}
        <table className="w-full">
          <tbody>
            <tr>
              {tabLabel('information', 'Information')}
              {tabLabel('crossrefs', 'Cross-refs', catalogCount > 0 ? catalogCount : undefined)}
              {graphs.length > 0 && tabLabel('variants', 'Variants', graphs.length)}
              {tabLabel('attestations', 'Attestations', graphemes.length)}
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
              <tr><td className="px-3 py-1 text-xs font-[800]">Catalog</td><td className="px-3 py-1 text-xs">{entry.catalog}</td></tr>
              <tr><td className="px-3 py-1 text-xs font-[800]">Code</td><td className="px-3 py-1 text-xs">{entry.catalog_code}</td></tr>
              {entry.reading_value && <tr><td className="px-3 py-1 text-xs font-[800]">Reading</td><td className="px-3 py-1 text-xs">{entry.reading_value}</td></tr>}
              {entry.reading_type && <tr><td className="px-3 py-1 text-xs font-[800]">Reading type</td><td className="px-3 py-1 text-xs">{entry.reading_type}</td></tr>}
              {entry.gloss_english && <tr><td className="px-3 py-1 text-xs font-[800]">Gloss</td><td className="px-3 py-1 text-xs">{entry.gloss_english}</td></tr>}
              {entry.gloss_mayan && <tr><td className="px-3 py-1 text-xs font-[800]">Mayan</td><td className="px-3 py-1 text-xs">{entry.gloss_mayan}</td></tr>}
              {entry.part_of_speech && entry.part_of_speech.length > 0 && (
                <tr><td className="px-3 py-1 text-xs font-[800]">Part of speech</td><td className="px-3 py-1 text-xs">{entry.part_of_speech.join(', ')}</td></tr>
              )}
              {entry.confidence_level != null && <tr><td className="px-3 py-1 text-xs font-[800]">Decipherment</td><td className="px-3 py-1 text-xs">{entry.confidence_level}/8</td></tr>}
              {entry.function_variant && <tr><td className="px-3 py-1 text-xs font-[800]">Function</td><td className="px-3 py-1 text-xs">{entry.function_variant}</td></tr>}
              {entry.notes && <tr><td className="px-3 py-1 text-xs font-[800]">Notes</td><td className="px-3 py-1 text-xs">{entry.notes}</td></tr>}
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Sources</td>
                <td className="px-3 py-1 text-xs">
                  {entry.legacy_catalog_sign_id && (
                    <Link to={`/sign/${entry.legacy_catalog_sign_id}`} className="underline hover:no-underline">MHD sign detail</Link>
                  )}
                  {entry.source_url && (
                    <>{entry.legacy_catalog_sign_id && ' · '}<a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Source catalog</a></>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* CROSS-REFERENCES */}
        {activeTab === 'crossrefs' && (
          crossRefs.length === 0 ? (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No cross-catalog links found</td></tr></tbody></table>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Catalog</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Code</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Reading</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Gloss</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Corr.</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Source</th>
                </tr>
              </thead>
              <tbody>
                {crossRefs.map((ref) => (
                  <tr key={ref.entry_id}>
                    <td className="px-3 py-1 text-xs font-[800]">{ref.catalog}</td>
                    <td className="px-3 py-1 text-xs font-[800]">
                      <Link to={`/entry/${ref.entry_id}`} className="underline hover:no-underline">{ref.catalog_code}</Link>
                    </td>
                    <td className="px-3 py-1 text-xs">{ref.reading_value || '-'}</td>
                    <td className="px-3 py-1 text-xs">{ref.gloss_english ? `"${ref.gloss_english}"` : '-'}</td>
                    <td className="px-3 py-1 text-xs">
                      {ref.correspondence === 'exact' ? '= exact' : ref.correspondence === 'approximate' ? '\u2248 approx' : ref.correspondence}
                    </td>
                    <td className="px-3 py-1 text-xs">{ref.asserted_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* VARIANTS */}
        {activeTab === 'variants' && (
          graphs.length === 0 ? (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No graph variants found</td></tr></tbody></table>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Image</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Suffix</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Type</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Medium</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Tags</th>
                </tr>
              </thead>
              <tbody>
                {graphs.map((g) => (
                  <tr key={g.graph_id}>
                    <td className="px-3 py-1">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.variant_suffix || ''} className="w-[50px] h-[50px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-xs font-[800]">{g.variant_suffix || '-'}</td>
                    <td className="px-3 py-1 text-xs">{g.variant_type_label || '-'}</td>
                    <td className="px-3 py-1 text-xs">{g.medium || '-'}</td>
                    <td className="px-3 py-1 text-xs">{g.iconographic_tags?.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ATTESTATIONS */}
        {activeTab === 'attestations' && (
          graphemes.length === 0 ? (
            <table className="w-full"><tbody><tr><td className="px-3 py-1 text-xs text-center">No instances found in corpus</td></tr></tbody></table>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-3 py-1 text-left text-xs uppercase">Block</th>
                    <th className="px-3 py-1 text-left text-xs uppercase">Reading</th>
                    <th className="px-3 py-1 text-left text-xs uppercase">Site</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {graphemes.map((g) => (
                    <tr key={g.id}>
                      <td className="px-3 py-1 align-top">
                        {g.block_id ? (
                          <Link to={`/block/${g.block_id}`} className="text-xs underline hover:no-underline font-[800]">
                            {g.mhd_block_id || `Block ${g.block_id}`}
                          </Link>
                        ) : (
                          <span className="text-xs">{g.grapheme_code}</span>
                        )}
                        {g.semantic_context && g.semantic_context !== '_' && (
                          <div className="text-[10px]">{g.semantic_context}</div>
                        )}
                      </td>
                      <td className="px-3 py-1 align-top">
                        {g.transcription_1 && g.transcription_1 !== '_' && (
                          <div className="text-xs">{g.transcription_1}</div>
                        )}
                        {g.block_english && g.block_english !== '_' && (
                          <div className="text-[10px]">"{g.block_english}"</div>
                        )}
                      </td>
                      <td className="px-3 py-1 align-top text-xs">
                        {g.site_name && (
                          <Link to={`/search?mode=blocks&site=${encodeURIComponent(g.site_name)}`} className="underline hover:no-underline">{g.site_name}</Link>
                        )}
                        {g.artifact_code && <span> · {g.artifact_code}</span>}
                        {g.coordinate && <div className="text-[10px]">{g.coordinate}</div>}
                      </td>
                      <td className="px-3 py-1 align-top text-right text-xs whitespace-nowrap">
                        {g.event_long_count && g.event_long_count !== '_' && g.event_long_count !== '-' && (
                          <div>{g.event_long_count}</div>
                        )}
                        {g.event_gregorian && (
                          <div className="text-[10px]">{g.event_gregorian}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {graphemes.length >= 200 && (
                <p className="text-xs text-center px-3 py-2">Showing first 200 attestations</p>
              )}
            </>
          )
        )}

      </div>
    </div>
  );
}
