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

const CATALOG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MHD: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
  TWKM: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
  Thompson: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
  CMGG: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
};

function catalogBadge(catalog: string) {
  const colors = CATALOG_COLORS[catalog] || { bg: 'bg-white', text: 'text-black', border: 'border-black' };
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

async function fetchEntryDetail(entryId: string, signal?: AbortSignal): Promise<{ entry: EntryData; crossRefs: CrossRef[]; graphs: GraphVariant[] }> {
  const res = await fetch(`/api/search?mode=entry_detail&entryId=${encodeURIComponent(entryId)}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch entry');
  return res.json();
}

export function EntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([]);
  const [graphs, setGraphs] = useState<GraphVariant[]>([]);
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

        {/* Cross-references */}
        {crossRefs.length > 0 && (
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
        )}

        {/* Visual Variants */}
        {graphs.length > 0 && (
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
        )}

        {crossRefs.length === 0 && graphs.length === 0 && (
          <p className="text-center text-black py-12">No concordance data available for this entry.</p>
        )}
      </div>
    </div>
  );
}
