import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Calendar, ChevronLeft, ExternalLink } from 'lucide-react';
import { fetchSign } from '../lib/api';
import type { CatalogSign } from '../types/database';
import type { SignGrapheme, SignRoboflowInstance } from '../../api/lib/types';

type TabType = 'info' | 'instances' | 'examples';

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
      .then((data) => { setSign(data.sign); setGraphemes(data.graphemes); setRoboflow(data.roboflow); })
      .catch((err) => { if (err instanceof DOMException && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Failed to load sign'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

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
          <Link to="/" className="text-blue-600 text-sm no-underline hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const displayCode = sign.mhd_code_sub || sign.graphcode || sign.mhd_code;

  const tabBtn = (tab: TabType, label: string) => (
    <button
      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1200px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-blue-600 no-underline text-sm mb-6 hover:underline">
          <ChevronLeft size={14} />
          Back to search
        </Link>

        {/* Header */}
        <div className="flex gap-10 max-md:flex-col max-md:gap-6 mb-8 pb-8 border-b border-gray-200">
          <div className="shrink-0 w-[250px] h-[250px] max-md:w-full max-md:h-[200px] bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-6">
            {sign.primary_image_url ? (
              <img src={sign.primary_image_url} alt={displayCode} loading="lazy" width={200} height={200} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl max-md:text-2xl text-gray-900 mb-4 font-bold">{displayCode}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {sign.thompson_code && (
                <span className="bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded">T{sign.thompson_code}</span>
              )}
              {sign.zender_code && (
                <span className="bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded">{sign.zender_code}</span>
              )}
              {sign.kettunen_code && (
                <span className="bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded">{sign.kettunen_code}</span>
              )}
              {sign.bonn_sign_number && (
                <span className="bg-blue-50 text-blue-700 text-xs font-mono px-2 py-1 rounded">Bonn {sign.bonn_sign_number}</span>
              )}
            </div>
            {(sign.zender_code || sign.mhd_code || roboflow.length > 0) && (
              <div className="flex flex-wrap gap-3 mb-4">
                {sign.zender_code && (
                  <a href="https://classicmayan.org/signCatalog.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline no-underline inline-flex items-center gap-1">
                    ClassicMayan.org <ExternalLink size={11} />
                  </a>
                )}
                {sign.mhd_code && (
                  <a href="https://mayadatabase.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline no-underline inline-flex items-center gap-1">
                    MHD <ExternalLink size={11} />
                  </a>
                )}
                {roboflow.length > 0 && (
                  <a href="https://universe.roboflow.com/maya-glyphs/yax-w4l6k" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline no-underline inline-flex items-center gap-1">
                    Roboflow <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
            {sign.english_translation && <div className="mb-2 text-sm text-gray-700"><span className="font-medium text-gray-500 mr-2">Meaning:</span>{sign.english_translation}</div>}
            {sign.syllabic_value && <div className="mb-2 text-sm text-blue-600 italic"><span className="font-medium text-gray-500 mr-2 not-italic">Syllabic:</span>{sign.syllabic_value}</div>}
            {sign.logographic_value && <div className="mb-2 text-sm text-gray-700"><span className="font-medium text-gray-500 mr-2">Logographic:</span>{sign.logographic_value}</div>}
            {sign.word_class && <div className="mb-2 text-sm text-gray-700"><span className="font-medium text-gray-500 mr-2">Word class:</span>{sign.word_class}</div>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabBtn('info', 'Information')}
          {tabBtn('instances', `Instances (${graphemes.length})`)}
          {tabBtn('examples', `ML Examples (${roboflow.length})`)}
        </div>

        {/* Tab Content */}
        <div className="border border-gray-200 rounded-lg p-6 min-h-[300px]">
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

          {activeTab === 'instances' && (
            graphemes.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No instances found in corpus</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-1 gap-4">
                {graphemes.map((g) => (
                  <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {g.block_img && g.block_id && (
                      <Link to={`/block/${g.block_id}`} className="block w-full h-[120px] bg-white border border-gray-200 rounded flex items-center justify-center mb-3 p-2 no-underline">
                        <img src={g.block_img} alt={g.grapheme_code} loading="lazy" width={120} height={120} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </Link>
                    )}
                    {g.block_img && !g.block_id && (
                      <div className="w-full h-[120px] bg-white border border-gray-200 rounded flex items-center justify-center mb-3 p-2">
                        <img src={g.block_img} alt={g.grapheme_code} loading="lazy" width={120} height={120} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="text-sm font-semibold mb-2">
                      <Link to={`/grapheme/${g.id}`} className="text-blue-600 no-underline hover:underline">{g.grapheme_code}</Link>
                    </div>
                    {g.block_maya1 && <div className="text-sm text-gray-700 mb-1">{g.block_maya1}</div>}
                    {g.block_english && <div className="text-xs text-gray-500 italic mb-2">&quot;{g.block_english}&quot;</div>}
                    <div className="flex gap-2 flex-wrap mt-1">
                      {g.artifact_code && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          <FileText size={10} className="text-gray-400" />{g.artifact_code}
                        </span>
                      )}
                      {g.event_calendar && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          <Calendar size={10} className="text-gray-400" />{g.event_calendar}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

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
