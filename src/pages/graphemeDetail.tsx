import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { useParams, Link } from 'react-router-dom';
import { fetchGrapheme } from '../lib/api';

type TabType = 'information' | 'context' | 'catalog';

export function GraphemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('information');

  const gId = id ? parseInt(id) : NaN;
  const idValid = !isNaN(gId);
  const idError = !id ? 'No ID provided' : !idValid ? 'Invalid grapheme ID' : null;

  const { data, isPending, error: queryError } = useQuery({
    queryKey: ['grapheme', gId],
    queryFn: ({ signal }) => fetchGrapheme(gId, signal),
    enabled: idValid,
  });

  const loading = idValid && isPending;
  const error = idError ?? (queryError ? queryError.message || 'Failed to load grapheme' : null);
  const grapheme = data ?? null;
  const prevGrapheme = (data as unknown as { prevGrapheme?: { id: number; code: string } } | undefined)?.prevGrapheme ?? null;
  const nextGrapheme = (data as unknown as { nextGrapheme?: { id: number; code: string } } | undefined)?.nextGrapheme ?? null;

  const hasValue = useCallback((val: string | null | undefined) => val && val !== '_' && val !== '-' && val !== 'N/A', []);
  const hasBlockContext = useMemo(() => hasValue(grapheme?.transcription_1) || hasValue(grapheme?.block_english), [grapheme, hasValue]);

  if (error) {
    return (
      <div className="max-w-[80ch] mx-auto px-4 py-4">
        <p className="text-sm">{error}</p>
        <Link to="/search" className="text-xs underline hover:no-underline">Back to search</Link>
      </div>
    );
  }

  if (loading || !grapheme) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ProgressBarLoader />
      </div>
    );
  }

  const tabLabel = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    return (
      <td className="px-3 py-1 cursor-pointer" onClick={() => setActiveTab(tab)}>
        <span className="text-sm inline-grid">
          <span className="invisible col-start-1 row-start-1 font-[800]">[{label}]</span>
          <span className="col-start-1 row-start-1">
            {isActive ? <strong>[{label}]</strong> : label}
          </span>
        </span>
      </td>
    );
  };

  const displayCode = grapheme.graphcode || grapheme.grapheme_code || 'Unknown';

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
                    <Link to="/search?mode=graphemes" className="underline hover:no-underline font-normal">Graphemes</Link>
                    {' > '}
                    <span className="font-[800]">{displayCode}</span>
                  </span>
                  <span className="font-normal whitespace-nowrap">
                    {prevGrapheme ? (
                      <Link to={`/grapheme/${prevGrapheme.id}`} className="no-underline" title={prevGrapheme.code}>&lsaquo;</Link>
                    ) : (
                      <span className="select-none">&lsaquo;</span>
                    )}
                    {' '}
                    {nextGrapheme ? (
                      <Link to={`/grapheme/${nextGrapheme.id}`} className="no-underline" title={nextGrapheme.code}>&rsaquo;</Link>
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
                {grapheme.primary_image_url ? (
                  <img src={grapheme.primary_image_url} alt={displayCode} loading="lazy" className="max-h-[200px] object-contain inline-block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-xs italic">no image</span>
                )}
                {hasValue(grapheme.grapheme_english) && <div className="text-xs mt-2">"{grapheme.grapheme_english}"</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tabs */}
        <table className="w-full">
          <tbody>
            <tr>
              {tabLabel('information', 'Information')}
              {hasBlockContext && tabLabel('context', 'Block Context')}
              {grapheme.catalog_sign_id && tabLabel('catalog', 'Catalog')}
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
              <tr><td className="px-3 py-1 text-xs font-[800]">Code</td><td className="px-3 py-1 text-xs">{grapheme.grapheme_code || displayCode}</td></tr>
              {grapheme.block_id && (
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Block</td>
                  <td className="px-3 py-1 text-xs">
                    <Link to={`/block/${grapheme.block_id}`} className="underline hover:no-underline">{grapheme.mhd_block_id || `Block ${grapheme.block_id}`}</Link>
                  </td>
                </tr>
              )}
              {hasValue(grapheme.artifact_code) && <tr><td className="px-3 py-1 text-xs font-[800]">Artifact</td><td className="px-3 py-1 text-xs">{grapheme.artifact_code}</td></tr>}
              {hasValue(grapheme.surface_page) && <tr><td className="px-3 py-1 text-xs font-[800]">Surface</td><td className="px-3 py-1 text-xs">{grapheme.surface_page}</td></tr>}
              {hasValue(grapheme.site_name) && <tr><td className="px-3 py-1 text-xs font-[800]">Site</td><td className="px-3 py-1 text-xs">{grapheme.site_name}</td></tr>}
              {hasValue(grapheme.region) && <tr><td className="px-3 py-1 text-xs font-[800]">Region</td><td className="px-3 py-1 text-xs">{grapheme.region}</td></tr>}
              {hasValue(grapheme.event_calendar) && <tr><td className="px-3 py-1 text-xs font-[800]">Calendar</td><td className="px-3 py-1 text-xs">{grapheme.event_calendar}</td></tr>}
              {hasValue(grapheme.event_long_count) && <tr><td className="px-3 py-1 text-xs font-[800]">Long Count</td><td className="px-3 py-1 text-xs">{grapheme.event_long_count}</td></tr>}
              {hasValue(grapheme.grapheme_maya) && <tr><td className="px-3 py-1 text-xs font-[800]">Maya text</td><td className="px-3 py-1 text-xs">{grapheme.grapheme_maya}</td></tr>}
              {hasValue(grapheme.grapheme_english) && <tr><td className="px-3 py-1 text-xs font-[800]">Translation</td><td className="px-3 py-1 text-xs">"{grapheme.grapheme_english}"</td></tr>}
            </tbody>
          </table>
        )}

        {/* BLOCK CONTEXT */}
        {activeTab === 'context' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Field</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              {hasValue(grapheme.transcription_1) && <tr><td className="px-3 py-1 text-xs font-[800]">Transcription</td><td className="px-3 py-1 text-xs">{grapheme.transcription_1}</td></tr>}
              {hasValue(grapheme.block_english) && <tr><td className="px-3 py-1 text-xs font-[800]">English</td><td className="px-3 py-1 text-xs">"{grapheme.block_english}"</td></tr>}
            </tbody>
          </table>
        )}

        {/* CATALOG */}
        {activeTab === 'catalog' && grapheme.catalog_sign_id && (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Field</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-1 text-xs font-[800]">Graph code</td><td className="px-3 py-1 text-xs">{grapheme.graphcode}</td></tr>
              {hasValue(grapheme.syllabic_value) && <tr><td className="px-3 py-1 text-xs font-[800]">Reading</td><td className="px-3 py-1 text-xs">{grapheme.syllabic_value}</td></tr>}
              {hasValue(grapheme.logographic_value) && <tr><td className="px-3 py-1 text-xs font-[800]">Logographic</td><td className="px-3 py-1 text-xs">{grapheme.logographic_value}</td></tr>}
              {hasValue(grapheme.logographic_cvc) && <tr><td className="px-3 py-1 text-xs font-[800]">CVC</td><td className="px-3 py-1 text-xs">{grapheme.logographic_cvc}</td></tr>}
              {hasValue(grapheme.english_translation) && <tr><td className="px-3 py-1 text-xs font-[800]">Translation</td><td className="px-3 py-1 text-xs">"{grapheme.english_translation}"</td></tr>}
              {hasValue(grapheme.word_class) && <tr><td className="px-3 py-1 text-xs font-[800]">Word class</td><td className="px-3 py-1 text-xs">{grapheme.word_class}</td></tr>}
              {hasValue(grapheme.thompson_code) && <tr><td className="px-3 py-1 text-xs font-[800]">Thompson</td><td className="px-3 py-1 text-xs">T{grapheme.thompson_code}{grapheme.thompson_variant ? ` (var. ${grapheme.thompson_variant})` : ''}</td></tr>}
              {hasValue(grapheme.zender_code) && <tr><td className="px-3 py-1 text-xs font-[800]">TWKM</td><td className="px-3 py-1 text-xs">{grapheme.zender_code}</td></tr>}
              {hasValue(grapheme.kettunen_code) && <tr><td className="px-3 py-1 text-xs font-[800]">Kettunen</td><td className="px-3 py-1 text-xs">{grapheme.kettunen_code}</td></tr>}
              {hasValue(grapheme.gronemeyer_code) && <tr><td className="px-3 py-1 text-xs font-[800]">Gronemeyer</td><td className="px-3 py-1 text-xs">{grapheme.gronemeyer_code}</td></tr>}
              {grapheme.bonn_sign_number && <tr><td className="px-3 py-1 text-xs font-[800]">Bonn</td><td className="px-3 py-1 text-xs">Sign {grapheme.bonn_sign_number}</td></tr>}
              {hasValue(grapheme.sign_technique) && <tr><td className="px-3 py-1 text-xs font-[800]">Technique</td><td className="px-3 py-1 text-xs">{grapheme.sign_technique}</td></tr>}
              {hasValue(grapheme.distribution) && <tr><td className="px-3 py-1 text-xs font-[800]">Distribution</td><td className="px-3 py-1 text-xs">{grapheme.distribution}</td></tr>}
              {hasValue(grapheme.picture_description) && <tr><td className="px-3 py-1 text-xs font-[800]">Depicts</td><td className="px-3 py-1 text-xs">{grapheme.picture_description}</td></tr>}
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Full entry</td>
                <td className="px-3 py-1 text-xs">
                  <Link to={`/sign/${grapheme.catalog_sign_id}`} className="underline hover:no-underline">View sign detail</Link>
                </td>
              </tr>
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
