import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, MapPin } from 'lucide-react';
import { fetchSign } from '../lib/api';
import type { CatalogSign } from '../types/database';
import type { SignGrapheme, SignRoboflowInstance } from '../../api/lib/types';

interface CrossRef {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  reading_value: string | null;
  gloss_english: string | null;
  part_of_speech: string[] | null;
  confidence_level: number | null;
  entry_image_url: string | null;
  correspondence: string;
  asserted_by: string | null;
}

interface GraphVariant {
  graph_id: string;
  variant_suffix: string | null;
  variant_type_label: string | null;
  medium: string | null;
  image_url: string | null;
  iconographic_tags: string[] | null;
  notes: string | null;
}

type TabType = 'concordance' | 'variants' | 'attestations' | 'info' | 'examples';

const CATALOG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MHD: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  TWKM: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  Thompson: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  CMGG: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

function catalogBadge(catalog: string) {
  const colors = CATALOG_COLORS[catalog] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

function ConfidenceBar({ level, max = 8 }: { level: number; max?: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>Decipherment:</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-sm ${
              i < level
                ? level <= 3
                  ? 'bg-amber-500'
                  : 'bg-green-600'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] text-gray-400">{level}/{max}</span>
    </div>
  );
}

function RoboflowCard({ instance: r }: { instance: SignRoboflowInstance }) {
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);
  const hasBbox = r.bbox_x != null && r.bbox_y != null && r.bbox_width != null && r.bbox_height != null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative bg-white flex items-center justify-center">
        <img
          src={r.image_url}
          alt={`Training example ${r.id}`}
          loading="lazy"
          className="w-full max-h-[250px] object-contain bg-white"
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {hasBbox && natSize && (
          <div
            className="absolute border-2 border-blue-400 bg-blue-400/15 pointer-events-none rounded-sm"
            style={{
              left: `${(r.bbox_x! / natSize.w) * 100}%`,
              top: `${(r.bbox_y! / natSize.h) * 100}%`,
              width: `${(r.bbox_width! / natSize.w) * 100}%`,
              height: `${(r.bbox_height! / natSize.h) * 100}%`,
            }}
          />
        )}
      </div>
      <div className="p-2.5 flex justify-between items-center gap-2 border-t border-gray-200">
        {r.confidence != null && <div className="text-gray-600 text-sm font-medium">{Math.round(r.confidence * 100)}%</div>}
        {r.dataset_split && (
          <div className="py-0.5 px-1.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500 font-medium uppercase">{r.dataset_split}</div>
        )}
      </div>
    </div>
  );
}

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<CatalogSign | null>(null);
  const [graphemes, setGraphemes] = useState<SignGrapheme[]>([]);
  const [roboflow, setRoboflow] = useState<SignRoboflowInstance[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([]);
  const [graphVariants, setGraphVariants] = useState<GraphVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('concordance');

  useEffect(() => {
    if (!id) { setError('No ID provided'); setLoading(false); return; }
    const signId = parseInt(id);
    if (isNaN(signId)) { setError('Invalid sign ID'); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchSign(signId, controller.signal)
      .then((data) => {
        setSign(data.sign);
        setGraphemes(data.graphemes);
        setRoboflow(data.roboflow);
        setCrossRefs((data as unknown as { crossRefs?: CrossRef[] }).crossRefs || []);
        setGraphVariants((data as unknown as { graphs?: GraphVariant[] }).graphs || []);
      })
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load sign'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  // Determine default tab based on available data
  useEffect(() => {
    if (crossRefs.length > 0) setActiveTab('concordance');
    else if (graphemes.length > 0) setActiveTab('attestations');
    else setActiveTab('info');
  }, [crossRefs.length, graphemes.length]);

  const confidenceLevel = useMemo(() => {
    // Use bonn_confidence if available, otherwise derive from data completeness
    if (sign?.bonn_confidence) return Math.min(8, Math.round(sign.bonn_confidence));
    let level = 0;
    if (sign?.syllabic_value) level += 3;
    if (sign?.logographic_value) level += 2;
    if (sign?.english_translation) level += 1;
    if (sign?.word_class) level += 1;
    if (crossRefs.length > 3) level += 1;
    return Math.min(8, level);
  }, [sign, crossRefs.length]);

  const catalogCount = useMemo(() => {
    const catalogs = new Set(crossRefs.map(r => r.catalog));
    return catalogs.size;
  }, [crossRefs]);

  if (loading) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-500">Loading sign...</p>
        </div>
      </div>
    );
  }

  if (error || !sign) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-gray-600 mb-4">{error || 'Sign not found'}</p>
          <Link to="/search" className="text-blue-600 text-sm no-underline hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const displayCode = sign.mhd_code_sub || sign.graphcode || sign.mhd_code;

  const tabBtn = (tab: TabType, label: string, count?: number) => (
    <button
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === tab ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 font-mono text-xs text-gray-400">{count}</span>}
    </button>
  );

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-gray-400 mb-6">
          <Link to="/search" className="text-blue-600 no-underline hover:underline">Search</Link>
          <span>&rsaquo;</span>
          <span>Signs</span>
          <span>&rsaquo;</span>
          <span className="text-gray-700 font-medium">
            {displayCode}{sign.thompson_code ? ` / T${sign.thompson_code}` : ''}
          </span>
        </div>

        {/* Hero: Image + Primary Meta */}
        <div className="flex gap-0 mb-0 border border-gray-200 rounded-t-lg overflow-hidden">
          {/* Image panel */}
          <div className="shrink-0 w-[250px] max-md:w-[160px] bg-gray-50 border-r border-gray-200 flex flex-col items-center justify-center p-6 gap-3">
            {sign.primary_image_url ? (
              <img src={sign.primary_image_url} alt={displayCode} loading="lazy" width={200} height={200} className="max-w-full max-h-[140px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : sign.bonn_image_url ? (
              <img src={sign.bonn_image_url} alt={displayCode} loading="lazy" width={200} height={200} className="max-w-full max-h-[140px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-[140px] h-[90px] bg-white border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-xs font-mono">
                no image
              </div>
            )}
            <div className="text-[10px] font-mono text-gray-400 text-center">
              Idealized grapheme &middot; {sign.thompson_code ? `T${sign.thompson_code}` : displayCode}{sign.bonn_sign_number ? `·st` : ''}
            </div>
            {sign.bonn_image_url && (
              <div className="text-[9px] text-gray-300 text-center">Drawn: Christian Prager / TWKM</div>
            )}
          </div>

          {/* Meta panel */}
          <div className="flex-1 p-6 max-md:p-4">
            <h1 className="text-3xl max-md:text-2xl text-gray-900 font-bold mb-1">{displayCode}</h1>
            {(sign.syllabic_value || sign.english_translation || sign.word_class) && (
              <div className="text-gray-500 text-sm mb-4 font-mono">
                {sign.word_class && <span className="uppercase">{sign.word_class}</span>}
                {sign.word_class && sign.english_translation && <span> &middot; </span>}
                {sign.english_translation && <em className="font-serif">&ldquo;{sign.english_translation}&rdquo;</em>}
              </div>
            )}

            {/* Catalog badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${catalogBadge('MHD')}`}>
                MHD: {sign.mhd_code}
              </span>
              {sign.thompson_code && (
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${catalogBadge('Thompson')}`}>
                  Thompson: T{sign.thompson_code}
                </span>
              )}
              {sign.zender_code && (
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${catalogBadge('TWKM')}`}>
                  TWKM: {sign.zender_code}
                </span>
              )}
              {sign.kettunen_code && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-200">
                  Kettunen: {sign.kettunen_code}
                </span>
              )}
              {sign.gronemeyer_code && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-200">
                  Gronemeyer: {sign.gronemeyer_code}
                </span>
              )}
              {crossRefs.filter(r => r.catalog === 'CMGG').map(r => (
                <span key={r.entry_id} className={`font-mono text-[11px] px-2 py-0.5 rounded border ${catalogBadge('CMGG')}`}>
                  CMGG: &ldquo;{r.catalog_code}&rdquo;
                </span>
              ))}
            </div>

            {/* Part of speech + picture description tags */}
            {(sign.word_class || sign.picture_description) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {sign.word_class && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600">
                    {sign.word_class}
                  </span>
                )}
                {sign.picture_description && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600">
                    {sign.picture_description}
                  </span>
                )}
              </div>
            )}

            {/* External links */}
            <div className="flex flex-wrap gap-2 mb-3">
              {sign.zender_code && (
                <a href="https://classicmayan.org/signCatalog.html" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 text-xs no-underline px-2.5 py-1 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
                  ClassicMayan.org <ExternalLink size={10} />
                </a>
              )}
              <a href="https://mayadatabase.org" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 text-xs no-underline px-2.5 py-1 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
                MHD <ExternalLink size={10} />
              </a>
              {sign.gronemeyer_code && (
                <a href="https://mayaglyphs.org" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 text-xs no-underline px-2.5 py-1 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
                  mayaglyphs.org <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* Confidence bar */}
            <ConfidenceBar level={confidenceLevel} />

            <div className="mt-2 text-xs text-gray-400 italic">
              {sign.syllabic_value
                ? <>Pronunciation: <span className="text-blue-600 not-italic font-medium">{sign.syllabic_value}</span></>
                : `No pronunciation assigned in ${sign.zender_code ? 'TWKM or ' : ''}MHD.${sign.english_translation ? ` English gloss "${sign.english_translation}" from ${sign.kettunen_code ? 'CMGG' : 'MHD'}.` : ''}`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-x border-gray-200 bg-gray-50 overflow-x-auto px-4">
          {tabBtn('concordance', 'Concordance', catalogCount > 0 ? catalogCount : undefined)}
          {graphVariants.length > 0 && tabBtn('variants', 'Variants', graphVariants.length)}
          {tabBtn('attestations', 'Attestations', graphemes.length)}
          {tabBtn('info', 'Information')}
          {roboflow.length > 0 && tabBtn('examples', 'ML Examples', roboflow.length)}
        </div>

        {/* Tab Content */}
        <div className="border border-gray-200 rounded-b-lg p-6 min-h-[300px]">

          {/* CONCORDANCE TABLE */}
          {activeTab === 'concordance' && (
            crossRefs.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No cross-references found in concordance tables</p>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 m-0">Cross-catalog identifiers</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                    &asymp; = approximate correspondence
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Catalog</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Code</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Reading</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Gloss</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">PoS</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Confidence</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Correspondence</th>
                        <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400 p-2 pb-2 border-b border-gray-200 bg-gray-50">Asserted by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Self row (MHD) */}
                      <tr className="hover:bg-gray-50">
                        <td className="p-2.5 border-b border-gray-100">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${catalogBadge('MHD')}`}>MHD</span>
                        </td>
                        <td className="p-2.5 border-b border-gray-100 font-mono font-medium">{sign.mhd_code}</td>
                        <td className="p-2.5 border-b border-gray-100">
                          {sign.syllabic_value ? <span className="italic font-serif">{sign.syllabic_value}</span> : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                        </td>
                        <td className="p-2.5 border-b border-gray-100">
                          {sign.english_translation ? <span className="italic font-serif">&ldquo;{sign.english_translation}&rdquo;</span> : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                        </td>
                        <td className="p-2.5 border-b border-gray-100">
                          {sign.word_class ? <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600">{sign.word_class}</span> : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                        </td>
                        <td className="p-2.5 border-b border-gray-100 text-gray-300 font-mono text-xs">&mdash;</td>
                        <td className="p-2.5 border-b border-gray-100 text-gray-400 font-mono text-xs italic">self</td>
                        <td className="p-2.5 border-b border-gray-100 text-gray-400 text-xs">&mdash;</td>
                      </tr>
                      {crossRefs.map((ref) => (
                        <tr key={ref.entry_id} className="hover:bg-gray-50">
                          <td className="p-2.5 border-b border-gray-100">
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${catalogBadge(ref.catalog)}`}>{ref.catalog}</span>
                          </td>
                          <td className="p-2.5 border-b border-gray-100 font-mono font-medium">{ref.catalog_code}</td>
                          <td className="p-2.5 border-b border-gray-100">
                            {ref.reading_value ? <span className="italic font-serif">{ref.reading_value}</span> : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                          </td>
                          <td className="p-2.5 border-b border-gray-100">
                            {ref.gloss_english ? <span className="italic font-serif">&ldquo;{ref.gloss_english}&rdquo;</span> : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                          </td>
                          <td className="p-2.5 border-b border-gray-100">
                            {ref.part_of_speech && ref.part_of_speech.length > 0 ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600">{ref.part_of_speech.join(', ')}</span>
                            ) : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                          </td>
                          <td className="p-2.5 border-b border-gray-100">
                            {ref.confidence_level != null ? (
                              <span className="font-mono text-xs">{ref.confidence_level}/8</span>
                            ) : <span className="text-gray-300 font-mono text-xs">&mdash;</span>}
                          </td>
                          <td className="p-2.5 border-b border-gray-100">
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              ref.correspondence === 'exact'
                                ? 'bg-green-50 text-green-700'
                                : ref.correspondence === 'approximate'
                                ? 'bg-amber-50 text-amber-700'
                                : ref.correspondence === 'disputed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {ref.correspondence === 'exact' ? '= exact' : ref.correspondence === 'approximate' ? '\u2248 approximate' : ref.correspondence}
                            </span>
                          </td>
                          <td className="p-2.5 border-b border-gray-100 text-gray-400 text-xs">{ref.asserted_by || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {crossRefs.some(r => r.correspondence === 'approximate') && (
                  <p className="text-xs text-gray-400 italic mt-4">
                    Approximate (&asymp;) correspondences may not map 1:1 across all contexts. Different catalogs may group or split sign forms differently.
                  </p>
                )}
              </div>
            )
          )}

          {/* VARIANTS */}
          {activeTab === 'variants' && (
            graphVariants.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No visual variants available</p>
            ) : (
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-4">
                  Graph variants &mdash; TWKM two-letter suffix system
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] max-md:grid-cols-2 gap-3">
                  {graphVariants.map((g) => (
                    <div key={g.graph_id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center p-3 gap-2 hover:border-gray-300 transition-colors">
                      {g.image_url ? (
                        <div className="h-[80px] w-[80px] flex items-center justify-center">
                          <img src={g.image_url} alt={g.variant_suffix || 'variant'} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div className="w-[80px] h-[52px] bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[9px] font-mono">
                          image
                        </div>
                      )}
                      <div className="font-mono text-xs font-medium text-center">
                        {displayCode}{g.variant_suffix ? `.${g.variant_suffix.replace(/^st$/, '1')}` : ''} {g.variant_suffix && <span className="text-gray-400 font-normal">· {sign.bonn_sign_number || ''}{g.variant_suffix}</span>}
                      </div>
                      {g.variant_type_label && (
                        <div className="text-[10px] text-gray-500">{g.variant_type_label}</div>
                      )}
                      {g.medium && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">{g.medium}</span>
                      )}
                      {g.notes && <div className="text-[11px] text-gray-500 text-center">{g.notes}</div>}
                      {sign.thompson_code && (
                        <div className="text-[10px] font-mono text-gray-400">
                          {crossRefs.find(r => r.catalog === 'Thompson')
                            ? `≈ T${crossRefs.find(r => r.catalog === 'Thompson')!.catalog_code}`
                            : `≈ T${sign.thompson_code}`}
                        </div>
                      )}
                      {g.iconographic_tags && g.iconographic_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {g.iconographic_tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-1 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{tag}</span>
                          ))}
                          {g.iconographic_tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{g.iconographic_tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* "+ add variant" placeholder */}
                  <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden flex flex-col items-center justify-center p-3 gap-2 bg-gray-50/50 min-h-[140px] cursor-default">
                    <div className="text-gray-300 text-sm">+ add</div>
                    <div className="font-mono text-xs text-gray-300">New variant</div>
                    <div className="text-[10px] text-gray-300">from corpus</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic mt-4">
                  Variant codes follow Prager &amp; Gronemeyer (2018). &ldquo;st&rdquo; = standard form. Additional suffixes (bt, tt, fh, hc&hellip;) documented when attested.
                </p>
              </div>
            )
          )}

          {/* ATTESTATIONS */}
          {activeTab === 'attestations' && (
            graphemes.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No instances found in corpus</p>
            ) : (
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-4">
                  Known instances in corpus &mdash; linked to glyph block records
                </h3>
                <div className="flex flex-col gap-2">
                  {graphemes.map((g) => (
                    <div key={g.id} className="grid grid-cols-[70px_1fr_1fr_1fr_auto] max-md:grid-cols-1 gap-3 items-center p-3 border border-gray-200 rounded bg-white hover:border-gray-300 transition-colors">
                      {/* Thumbnail */}
                      <div className="max-md:hidden">
                        {g.block_img ? (
                          <Link to={g.block_id ? `/block/${g.block_id}` : '#'} className="block">
                            <img src={g.block_img} alt="" loading="lazy" className="w-[60px] h-[42px] object-contain rounded border border-gray-200 bg-gray-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </Link>
                        ) : (
                          <div className="w-[60px] h-[42px] bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[8px] font-mono">
                            img
                          </div>
                        )}
                      </div>

                      {/* Block ID + context */}
                      <div>
                        {g.block_id ? (
                          <Link to={`/block/${g.block_id}`} className="text-blue-600 no-underline hover:underline font-mono text-[11px]">
                            {g.mhd_block_id || `Block ${g.block_id}`}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] text-gray-500">{g.grapheme_code}</span>
                        )}
                        {g.semantic_context && g.semantic_context !== '_' && (
                          <div className="text-[11px] text-gray-400">{g.semantic_context}</div>
                        )}
                      </div>

                      {/* Reading */}
                      <div>
                        {g.block_maya1 && g.block_maya1 !== '_' ? (
                          <div className="font-serif italic text-sm">{g.block_maya1}</div>
                        ) : null}
                        {g.block_english && g.block_english !== '_' && (
                          <div className="text-[11px] text-gray-400">&ldquo;{g.block_english}&rdquo;</div>
                        )}
                      </div>

                      {/* Site */}
                      <div className="text-xs text-gray-500">
                        {g.site_name && (
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-gray-300" />
                            <Link to={`/search?mode=blocks&site=${encodeURIComponent(g.site_name)}`} className="text-blue-600 no-underline hover:underline">{g.site_name}</Link>
                            {g.artifact_code && <span className="text-gray-400">&middot; {g.artifact_code}</span>}
                          </div>
                        )}
                        {g.surface_page && g.surface_page !== '_' && (
                          <div className="text-[10px] text-gray-400">{g.surface_page}{g.orientation_frame && g.orientation_frame !== '_' ? `, ${g.orientation_frame}` : ''}</div>
                        )}
                        {g.coordinate && <div className="font-mono text-[10px] text-gray-400">{g.coordinate}</div>}
                      </div>

                      {/* Date */}
                      <div className="text-right font-mono text-[11px] text-gray-400 whitespace-nowrap">
                        {g.event_long_count && g.event_long_count !== '_' && g.event_long_count !== '-' ? (
                          <div><span className="text-gray-300">ev:</span> {g.event_long_count}</div>
                        ) : null}
                        {g.event_gregorian && (
                          <div className="text-[10px]">{g.event_gregorian}</div>
                        )}
                        {!g.event_long_count && g.event_calendar && g.event_calendar !== '_' && (
                          <div><span className="text-gray-300">ev:</span> {g.event_calendar}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {graphemes.length >= 200 && (
                    <div className="text-center py-3 text-xs text-gray-400 font-mono">
                      Showing first 200 attestations
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* INFORMATION */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-md:grid-cols-1 gap-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">MHD Code</span>
                <span className="text-gray-900 text-sm">{sign.mhd_code}</span>
              </div>
              {sign.mhd_code_sub && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Display Code</span>
                  <span className="text-gray-900 text-sm">{sign.mhd_code_sub}</span>
                </div>
              )}
              {sign.graphcode && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Graph Code</span>
                  <span className="text-gray-900 text-sm">{sign.graphcode}</span>
                </div>
              )}
              {sign.logographic_value && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Logographic</span>
                  <span className="text-gray-900 text-sm">{sign.logographic_value}</span>
                </div>
              )}
              {sign.volume && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Period</span>
                  <span className="text-gray-900 text-sm">{sign.volume}</span>
                </div>
              )}
              {sign.technique && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Technique</span>
                  <span className="text-gray-900 text-sm">{sign.technique}</span>
                </div>
              )}
              {sign.calendrical_name && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Calendrical</span>
                  <span className="text-gray-900 text-sm">{sign.calendrical_name}</span>
                </div>
              )}
              {sign.distribution && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Distribution</span>
                  <span className="text-gray-900 text-sm">{sign.distribution}</span>
                </div>
              )}
              {sign.bonn_sign_number && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Bonn/TWKM</span>
                  <span className="text-gray-900 text-sm">Sign {sign.bonn_sign_number}{sign.bonn_confidence != null ? ` (confidence ${sign.bonn_confidence})` : ''}</span>
                </div>
              )}
              {sign.notes && (
                <div className="col-span-full p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="block text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Notes</span>
                  <p className="text-gray-700 text-sm leading-relaxed m-0">{sign.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ML EXAMPLES */}
          {activeTab === 'examples' && (
            roboflow.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No ML training examples available</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-md:grid-cols-1 gap-4">
                {roboflow.map((r) => (
                  <RoboflowCard key={r.id} instance={r} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
