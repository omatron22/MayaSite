import { useEffect, useState, useMemo } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { useParams, Link } from 'react-router-dom';
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

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<CatalogSign | null>(null);
  const [graphemes, setGraphemes] = useState<SignGrapheme[]>([]);
  const [roboflow, setRoboflow] = useState<SignRoboflowInstance[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([]);
  const [graphVariants, setGraphVariants] = useState<GraphVariant[]>([]);
  const [prevSign, setPrevSign] = useState<{ id: number; code: string } | null>(null);
  const [nextSign, setNextSign] = useState<{ id: number; code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

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
        setPrevSign((data as unknown as { prevSign?: { id: number; code: string } }).prevSign || null);
        setNextSign((data as unknown as { nextSign?: { id: number; code: string } }).nextSign || null);
      })
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load sign'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const confidenceLevel = useMemo(() => {
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
    return new Set(crossRefs.map(r => r.catalog)).size;
  }, [crossRefs]);

  if (error) {
    return (
      <div className="max-w-[80ch] mx-auto px-4 py-4">
        <p className="text-sm">{error}</p>
        <Link to="/search" className="text-xs underline hover:no-underline">Back to search</Link>
      </div>
    );
  }

  if (loading || !sign) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ProgressBarLoader />
      </div>
    );
  }

  const displayCode = sign.mhd_code_sub || sign.graphcode || sign.mhd_code;

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
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs">
                <div className="flex justify-between items-center">
                  <span>
                    <Link to="/search" className="underline hover:no-underline font-normal">Search</Link>
                    {' > '}
                    <Link to="/search?mode=signs" className="underline hover:no-underline font-normal">Signs</Link>
                    {' > '}
                    <span className="font-[800]">{displayCode}</span>
                  </span>
                  <span className="font-normal whitespace-nowrap">
                    {prevSign ? (
                      <Link to={`/sign/${prevSign.id}`} className="no-underline" title={prevSign.code}>&lsaquo;</Link>
                    ) : (
                      <span className="select-none">&lsaquo;</span>
                    )}
                    {' '}
                    {nextSign ? (
                      <Link to={`/sign/${nextSign.id}`} className="no-underline" title={nextSign.code}>&rsaquo;</Link>
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
                {sign.primary_image_url ? (
                  <img src={sign.primary_image_url} alt={displayCode} loading="lazy" className="max-h-[200px] object-contain inline-block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : sign.bonn_image_url ? (
                  <img src={sign.bonn_image_url} alt={displayCode} loading="lazy" className="max-h-[200px] object-contain inline-block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-xs">no image</span>
                )}
                {sign.bonn_image_url && <div className="text-[9px] mt-1">Drawn: C. Prager / TWKM</div>}
                {sign.english_translation && <div className="text-xs mt-2">"{sign.english_translation}"</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tabs */}
        <table className="w-auto">
          <tbody>
            <tr>
              {tabLabel('info', 'Information')}
              {tabLabel('concordance', 'Concordance', catalogCount > 0 ? catalogCount : undefined)}
              {graphVariants.length > 0 && tabLabel('variants', 'Variants', graphVariants.length)}
              {tabLabel('attestations', 'Attestations', graphemes.length)}
              {roboflow.length > 0 && tabLabel('examples', 'ML Examples', roboflow.length)}
            </tr>
          </tbody>
        </table>

        {/* CONCORDANCE */}
        {activeTab === 'concordance' && (
          crossRefs.length === 0 ? (
            <p className="text-xs px-3 py-8 text-center">No cross-references found in concordance tables</p>
          ) : (
            <table className="w-auto">
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
                {/* Self row */}
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">MHD</td>
                  <td className="px-3 py-1 text-xs font-[800]">{sign.mhd_code}</td>
                  <td className="px-3 py-1 text-xs">{sign.syllabic_value || '-'}</td>
                  <td className="px-3 py-1 text-xs">{sign.english_translation ? `"${sign.english_translation}"` : '-'}</td>
                  <td className="px-3 py-1 text-xs">self</td>
                  <td className="px-3 py-1 text-xs">-</td>
                </tr>
                {crossRefs.map((ref) => (
                  <tr key={ref.entry_id}>
                    <td className="px-3 py-1 text-xs font-[800]">{ref.catalog}</td>
                    <td className="px-3 py-1 text-xs font-[800]">{ref.catalog_code}</td>
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
          graphVariants.length === 0 ? (
            <p className="text-xs px-3 py-8 text-center">No visual variants available</p>
          ) : (
            <table className="w-auto">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Image</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Suffix</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Type</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Medium</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Tags</th>
                  <th className="px-3 py-1 text-left text-xs uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {graphVariants.map((g) => (
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
                    <td className="px-3 py-1 text-xs">{g.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ATTESTATIONS */}
        {activeTab === 'attestations' && (
          graphemes.length === 0 ? (
            <p className="text-xs px-3 py-8 text-center">No instances found in corpus</p>
          ) : (
            <>
              <table className="w-auto">
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

        {/* INFORMATION */}
        {activeTab === 'info' && (
          <table className="w-auto">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Field</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-1 text-xs font-[800]">MHD Code</td><td className="px-3 py-1 text-xs">{sign.mhd_code}</td></tr>
              {sign.mhd_code_sub && <tr><td className="px-3 py-1 text-xs font-[800]">Display Code</td><td className="px-3 py-1 text-xs">{sign.mhd_code_sub}</td></tr>}
              {sign.graphcode && <tr><td className="px-3 py-1 text-xs font-[800]">Graph Code</td><td className="px-3 py-1 text-xs">{sign.graphcode}</td></tr>}
              {sign.syllabic_value && <tr><td className="px-3 py-1 text-xs font-[800]">Reading</td><td className="px-3 py-1 text-xs">{sign.syllabic_value}</td></tr>}
              {sign.logographic_value && <tr><td className="px-3 py-1 text-xs font-[800]">Logographic</td><td className="px-3 py-1 text-xs">{sign.logographic_value}</td></tr>}
              {sign.english_translation && <tr><td className="px-3 py-1 text-xs font-[800]">Gloss</td><td className="px-3 py-1 text-xs">{sign.english_translation}</td></tr>}
              {sign.word_class && <tr><td className="px-3 py-1 text-xs font-[800]">Word Class</td><td className="px-3 py-1 text-xs">{sign.word_class}</td></tr>}
              <tr><td className="px-3 py-1 text-xs font-[800]">Decipherment</td><td className="px-3 py-1 text-xs">{confidenceLevel}/8</td></tr>
              {sign.picture_description && sign.picture_description !== '?' && <tr><td className="px-3 py-1 text-xs font-[800]">Depicts</td><td className="px-3 py-1 text-xs">{sign.picture_description}</td></tr>}
              {sign.volume && <tr><td className="px-3 py-1 text-xs font-[800]">Period</td><td className="px-3 py-1 text-xs">{sign.volume}</td></tr>}
              {sign.technique && <tr><td className="px-3 py-1 text-xs font-[800]">Technique</td><td className="px-3 py-1 text-xs">{sign.technique}</td></tr>}
              {sign.distribution && <tr><td className="px-3 py-1 text-xs font-[800]">Distribution</td><td className="px-3 py-1 text-xs">{sign.distribution}</td></tr>}
              {sign.calendrical_name && <tr><td className="px-3 py-1 text-xs font-[800]">Calendrical</td><td className="px-3 py-1 text-xs">{sign.calendrical_name}</td></tr>}
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Catalogs</td>
                <td className="px-3 py-1 text-xs">
                  MHD {sign.mhd_code}
                  {sign.thompson_code && ` · Thompson T${sign.thompson_code}`}
                  {sign.zender_code && ` · TWKM ${sign.zender_code}`}
                  {sign.kettunen_code && ` · Kettunen ${sign.kettunen_code}`}
                  {sign.gronemeyer_code && ` · Gronemeyer ${sign.gronemeyer_code}`}
                </td>
              </tr>
              {sign.bonn_sign_number && <tr><td className="px-3 py-1 text-xs font-[800]">Bonn/TWKM</td><td className="px-3 py-1 text-xs">Sign {sign.bonn_sign_number}{sign.bonn_confidence != null ? ` (confidence ${sign.bonn_confidence})` : ''}</td></tr>}
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Sources</td>
                <td className="px-3 py-1 text-xs">
                  <a href="https://mayadatabase.org" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">MHD</a>
                  {sign.zender_code && (
                    <>{' · '}<a href="https://classicmayan.org" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">ClassicMayan.org</a></>
                  )}
                  {sign.gronemeyer_code && (
                    <>{' · '}<a href="https://mayaglyphs.org" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">mayaglyphs.org</a></>
                  )}
                </td>
              </tr>
              {sign.notes && <tr><td className="px-3 py-1 text-xs font-[800]">Notes</td><td className="px-3 py-1 text-xs">{sign.notes}</td></tr>}
            </tbody>
          </table>
        )}

        {/* ML EXAMPLES */}
        {activeTab === 'examples' && (
          roboflow.length === 0 ? (
            <p className="text-xs px-3 py-8 text-center">No ML training examples available</p>
          ) : (
            <table className="w-auto">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left text-xs uppercase">Image</th>
                  <th className="px-3 py-1 text-right text-xs uppercase">Confidence</th>
                  <th className="px-3 py-1 text-right text-xs uppercase">Split</th>
                </tr>
              </thead>
              <tbody>
                {roboflow.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-1">
                      <img src={r.image_url} alt={`Example ${r.id}`} loading="lazy" className="w-[120px] h-[80px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </td>
                    <td className="px-3 py-1 text-xs text-right">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '-'}</td>
                    <td className="px-3 py-1 text-xs text-right">{r.dataset_split || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

      </div>
    </div>
  );
}
