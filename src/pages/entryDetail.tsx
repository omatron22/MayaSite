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
  block_maya1: string | null;
  block_logosyll: string | null;
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

type TabType = 'crossrefs' | 'variants' | 'attestations';

const CATALOG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MHD: { bg: 'bg-black', text: 'text-white', border: 'border-black' },
  TWKM: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
  Thompson: { bg: 'bg-black/10', text: 'text-black', border: 'border-black' },
  CMGG: { bg: 'bg-white', text: 'text-black', border: 'border-black border-dashed' },
};

function catalogBadge(catalog: string) {
  const colors = CATALOG_COLORS[catalog] || { bg: 'bg-white', text: 'text-black', border: 'border-black' };
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

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
  const [activeTab, setActiveTab] = useState<TabType>('crossrefs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) { setError('No entry ID provided'); setLoading(false); return; }

    // If it looks like a legacy integer ID, redirect to /sign/:id
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
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load entry');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [entryId]);

  const catalogCount = useMemo(() => {
    const catalogs = new Set(crossRefs.map(r => r.catalog));
    return catalogs.size;
  }, [crossRefs]);

  if (loading) {
    return (
      <div className="bg-white p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <ProgressBarLoader />
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-black mb-4">{error || 'Entry not found'}</p>
          <Link to="/search?mode=concordance" className="text-black underline text-sm ">Back to concordance</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1000px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-black mb-6">
          <Link to="/search?mode=concordance" className="text-black underline  inline-flex items-center gap-1">
            ← Concordance
          </Link>
          <span>&rsaquo;</span>
          <span className="text-black">{entry.catalog}</span>
          <span>&rsaquo;</span>
          <span className="text-black font-[600]">{entry.catalog_code}</span>
        </div>

        {/* Hero */}
        <div className="flex gap-8 max-md:flex-col mb-8 pb-8 border-b-2 border-black">
          <div className="shrink-0 w-[200px] h-[200px] max-md:w-full max-md:h-[160px] bg-white border-2 border-black  flex items-center justify-center p-4">
            {entry.image_url ? (
              <img src={entry.image_url} alt={entry.catalog_code} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="text-black text-sm font-mono">No image</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-[800] uppercase text-black mb-2">{entry.catalog_code}</h1>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className={`font-mono text-[11px] px-2 py-0.5  border ${catalogBadge(entry.catalog)}`}>
                {entry.catalog}
              </span>
              {entry.reading_type && (
                <span className="font-mono text-[11px] px-2 py-0.5  border bg-white text-black border-black">
                  {entry.reading_type}
                </span>
              )}
            </div>

            {entry.reading_value && (
              <div className="mb-2">
                <span className="text-black text-sm mr-2">Reading:</span>
                <span className="text-black italic text-lg">{entry.reading_value}</span>
              </div>
            )}
            {entry.gloss_english && (
              <div className="mb-2 text-sm">
                <span className="text-black mr-2">Meaning:</span>
                <span className="text-black italic">&ldquo;{entry.gloss_english}&rdquo;</span>
              </div>
            )}
            {entry.gloss_mayan && (
              <div className="mb-2 text-sm">
                <span className="text-black mr-2">Mayan:</span>
                <span className="text-black italic">{entry.gloss_mayan}</span>
              </div>
            )}
            {entry.part_of_speech && entry.part_of_speech.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {entry.part_of_speech.map((pos, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5  bg-white border-2 border-black text-black">{pos}</span>
                ))}
              </div>
            )}
            {entry.confidence_level != null && (
              <div className="flex items-center gap-2 text-xs text-black mb-2">
                <span>Decipherment:</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className={`w-2.5 h-2.5  ${i < entry.confidence_level! ? 'bg-black' : 'bg-white'}`} />
                  ))}
                </div>
                <span>{entry.confidence_level}/8</span>
              </div>
            )}
            {entry.function_variant && (
              <div className="text-sm text-black">
                <span className="text-black mr-2">Function:</span>
                {entry.function_variant}
              </div>
            )}
            {entry.notes && (
              <div className="text-sm text-black mt-2 italic">{entry.notes}</div>
            )}

            <div className="flex gap-2 mt-3">
              {entry.legacy_catalog_sign_id && (
                <Link to={`/sign/${entry.legacy_catalog_sign_id}`} className="text-black underline text-sm  px-2 py-1 border-2 border-black  bg-white">
                  View full sign detail
                </Link>
              )}
              {entry.source_url && (
                <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="text-black underline text-sm  px-2 py-1 border-2 border-black  bg-white">
                  Source catalog
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-2 border-black mb-6">
          {([
            ['crossrefs', `Cross-refs (${crossRefs.length})`],
            ['variants', `Variants (${graphs.length})`],
            ['attestations', `Attestations (${graphemes.length})`],
          ] as [TabType, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
                activeTab === tab
                  ? 'border-black text-black font-[600]'
                  : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CROSS-REFERENCES */}
        {activeTab === 'crossrefs' && (
          crossRefs.length === 0 ? (
            <p className="text-center text-black py-12">No cross-catalog links found</p>
          ) : (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-black">
                  Cross-catalog identifiers &mdash; {catalogCount} catalogs, {crossRefs.length} links
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5  bg-white border-2 border-black text-black">
                  &asymp; = approximate
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Catalog</th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Code</th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Reading</th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Meaning</th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Correspondence</th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-black p-2 border-b-2 border-black bg-white">Asserted by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossRefs.map((ref) => (
                      <tr key={ref.entry_id} className="">
                        <td className="p-2.5 border-b border-black">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5  border ${catalogBadge(ref.catalog)}`}>{ref.catalog}</span>
                        </td>
                        <td className="p-2.5 border-b border-black">
                          <Link to={`/entry/${ref.entry_id}`} className="font-mono font-[600] text-black underline">{ref.catalog_code}</Link>
                        </td>
                        <td className="p-2.5 border-b border-black">
                          {ref.reading_value ? <span className="italic ">{ref.reading_value}</span> : <span className="text-black">&mdash;</span>}
                        </td>
                        <td className="p-2.5 border-b border-black">
                          {ref.gloss_english ? <span className="italic">&ldquo;{ref.gloss_english}&rdquo;</span> : <span className="text-black">&mdash;</span>}
                        </td>
                        <td className="p-2.5 border-b border-black">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5  border ${
                            ref.correspondence === 'exact' ? 'bg-white text-black border-black'
                              : ref.correspondence === 'approximate' ? 'bg-white text-black border-black'
                              : 'bg-white text-black border-black'
                          }`}>
                            {ref.correspondence === 'exact' ? '=' : ref.correspondence === 'approximate' ? '≈' : '~'} {ref.correspondence}
                          </span>
                        </td>
                        <td className="p-2.5 border-b border-black text-xs text-black">{ref.asserted_by || '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        )}

        {/* VARIANTS */}
        {activeTab === 'variants' && (
          graphs.length === 0 ? (
            <p className="text-center text-black py-12">No graph variants found</p>
          ) : (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-black mb-4">
                Graph variants &mdash; {graphs.length} forms
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] max-md:grid-cols-2 gap-3">
                {graphs.map((g) => (
                  <div key={g.graph_id} className="bg-white border-2 border-black  overflow-hidden flex flex-col items-center p-3 gap-2 hover:border-black ">
                    {g.image_url ? (
                      <div className="h-[80px] w-[80px] flex items-center justify-center">
                        <img src={g.image_url} alt={g.variant_suffix || 'variant'} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div className="w-[80px] h-[52px] bg-white border border-dashed border-black  flex items-center justify-center text-black text-[9px] font-mono">
                        image
                      </div>
                    )}
                    <div className="font-mono text-xs font-[600] text-center">
                      {g.variant_suffix || 'default'}
                    </div>
                    {g.variant_type_label && (
                      <div className="text-[10px] text-black">{g.variant_type_label}</div>
                    )}
                    {g.medium && (
                      <div className="text-[10px] text-black italic">{g.medium}</div>
                    )}
                    {g.notes && <div className="text-[11px] text-black text-center">{g.notes}</div>}
                    {g.iconographic_tags && g.iconographic_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {g.iconographic_tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-1 py-0.5 bg-white  text-[10px] text-black">{tag}</span>
                        ))}
                        {g.iconographic_tags.length > 3 && (
                          <span className="text-[10px] text-black">+{g.iconographic_tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        )}

        {/* ATTESTATIONS */}
        {activeTab === 'attestations' && (
          graphemes.length === 0 ? (
            <p className="text-center text-black py-12">No instances found in corpus</p>
          ) : (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-black mb-4">
                Known instances in corpus &mdash; linked to glyph block records
              </h3>
              <div className="flex flex-col gap-2">
                {graphemes.map((g) => (
                  <div key={g.id} className="grid grid-cols-[70px_1fr_1fr_1fr_auto] max-md:grid-cols-1 gap-3 items-center p-3 border-2 border-black bg-white hover:border-black ">
                    {/* Thumbnail */}
                    <div className="max-md:hidden">
                      {g.block_img ? (
                        <Link to={g.block_id ? `/block/${g.block_id}` : '#'} className="block">
                          <img src={g.block_img} alt="" loading="lazy" className="w-[60px] h-[42px] object-contain border-2 border-black bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </Link>
                      ) : (
                        <div className="w-[60px] h-[42px] bg-white border border-dashed border-black flex items-center justify-center text-black text-[8px] font-mono">
                          img
                        </div>
                      )}
                    </div>

                    {/* Block ID + context */}
                    <div>
                      {g.block_id ? (
                        <Link to={`/block/${g.block_id}`} className="text-black underline font-mono text-[11px]">
                          {g.mhd_block_id || `Block ${g.block_id}`}
                        </Link>
                      ) : (
                        <span className="font-mono text-[11px] text-black">{g.grapheme_code}</span>
                      )}
                      {g.semantic_context && g.semantic_context !== '_' && (
                        <div className="text-[11px] text-black">{g.semantic_context}</div>
                      )}
                    </div>

                    {/* Reading */}
                    <div>
                      {g.block_maya1 && g.block_maya1 !== '_' ? (
                        <div className="font-mono italic text-sm">{g.block_maya1}</div>
                      ) : null}
                      {g.block_english && g.block_english !== '_' && (
                        <div className="text-[11px] text-black">&ldquo;{g.block_english}&rdquo;</div>
                      )}
                    </div>

                    {/* Site */}
                    <div className="text-xs text-black">
                      {g.site_name && (
                        <div className="flex items-center gap-1">
                          <Link to={`/search?mode=blocks&site=${encodeURIComponent(g.site_name)}`} className="text-black underline">{g.site_name}</Link>
                          {g.artifact_code && <span className="text-black">&middot; {g.artifact_code}</span>}
                        </div>
                      )}
                      {g.surface_page && g.surface_page !== '_' && (
                        <div className="text-[10px] text-black">{g.surface_page}{g.orientation_frame && g.orientation_frame !== '_' ? `, ${g.orientation_frame}` : ''}</div>
                      )}
                      {g.coordinate && <div className="font-mono text-[10px] text-black">{g.coordinate}</div>}
                    </div>

                    {/* Date */}
                    <div className="text-right font-mono text-[11px] text-black whitespace-nowrap">
                      {g.event_long_count && g.event_long_count !== '_' && g.event_long_count !== '-' ? (
                        <div><span className="text-black">ev:</span> {g.event_long_count}</div>
                      ) : null}
                      {g.event_gregorian && (
                        <div className="text-[10px]">{g.event_gregorian}</div>
                      )}
                      {!g.event_long_count && g.event_calendar && g.event_calendar !== '_' && (
                        <div><span className="text-black">ev:</span> {g.event_calendar}</div>
                      )}
                    </div>
                  </div>
                ))}
                {graphemes.length >= 200 && (
                  <div className="text-center py-3 text-xs text-black font-mono">
                    Showing first 200 attestations
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
