import { useState, useEffect, useMemo, memo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchStats, fetchAnalytics } from '../lib/api';
import type { StatsResponse, AnalyticsDataSource, AnalyticsInstance } from '../../api/lib/types';
import { REGION_COLORS, TIME_PERIODS, REGIONS, getRegionColor } from '../lib/constants';
import { Info } from 'lucide-react';

const selectClass = "py-2 pr-8 pl-3 bg-white text-gray-700 border border-gray-300 rounded-md text-sm cursor-pointer transition-colors appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%236b7280%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat bg-[length:1rem] hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const getRegionYPosition = (region: string): number => {
  const positions: Record<string, number> = {
    'North': 5, 'East': 4, 'Central': 3, 'Usmacinta': 2, 'South': 1, 'Unknown': 0,
  };
  return positions[region] || 0;
};

const StatCard = memo(({ value, label, meta }: { value: string; label: string; meta?: string }) => (
  <div className="border border-gray-200 rounded-lg p-4 text-center">
    <div className="text-2xl font-bold text-gray-900 mb-1 leading-none">{value}</div>
    <div className="text-sm text-gray-500 font-medium">{label}</div>
    {meta && <div className="text-xs text-gray-400 mt-1">{meta}</div>}
  </div>
));
StatCard.displayName = 'StatCard';

const QualityBar = memo(({ label, percentage }: { label: string; percentage: number }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex justify-between items-center mb-2">
      <span className="font-medium text-gray-700 text-sm">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
    </div>
    <div className="bg-gray-100 h-1.5 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full transition-[width] duration-500" style={{ width: `${percentage}%` }} />
    </div>
  </div>
));
QualityBar.displayName = 'QualityBar';

const RegionBar = memo(({ region, count, percentage }: { region: string; count: number; percentage: number }) => (
  <div className="grid grid-cols-[100px_1fr_80px_60px] max-md:grid-cols-1 items-center gap-3 max-md:gap-1 p-2 hover:bg-gray-50 rounded">
    <div className="font-medium text-gray-700 text-sm">{region}</div>
    <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percentage}%`, background: getRegionColor(region) }} />
    </div>
    <div className="text-right max-md:text-left font-medium text-gray-700 text-sm">{count.toLocaleString()}</div>
    <div className="text-right max-md:text-left text-gray-400 text-xs">{percentage.toFixed(1)}%</div>
  </div>
));
RegionBar.displayName = 'RegionBar';

interface TooltipPayloadItem {
  payload: AnalyticsInstance & { y: number };
}

const OptimizedTooltip = memo(({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 max-w-[220px] pointer-events-none text-gray-900">
      <div className="font-bold text-base text-center mb-1 pb-1 border-b border-gray-100">{d.sign}</div>
      {d.syllabic && <div className="text-blue-600 italic text-xs text-center mb-2">{d.syllabic}</div>}
      <div className="text-xs text-gray-600 leading-relaxed">
        <div><span className="text-gray-400 font-medium">Year:</span> {d.year ? `~${d.year} CE` : 'Undated'}</div>
        <div><span className="text-gray-400 font-medium">Region:</span> {d.region}</div>
        <div><span className="text-gray-400 font-medium">Site:</span> {d.site}</div>
        {d.longCount !== 'N/A' && <div><span className="text-gray-400 font-medium">LC:</span> {d.longCount}</div>}
      </div>
    </div>
  );
});
OptimizedTooltip.displayName = 'OptimizedTooltip';

export function ResearchPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [allData, setAllData] = useState<AnalyticsInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<AnalyticsDataSource>('mhd');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStats(controller.signal),
      fetchAnalytics(dataSource, selectedPeriod, selectedRegion, controller.signal),
    ])
      .then(([statsData, analyticsData]) => {
        setStats(statsData);
        setAllData(analyticsData.data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [dataSource, selectedPeriod, selectedRegion]);

  const sampledTimelineData = useMemo(() => {
    const validData = allData.filter(d => d.year !== null);
    if (validData.length <= 2000) return validData;

    const sampleSize = 2000;
    const samplesPerRegion = Math.floor(sampleSize / REGIONS.length);
    const sampled: AnalyticsInstance[] = [];

    REGIONS.forEach(region => {
      const regionData = validData.filter(d => d.region === region);
      if (regionData.length === 0) return;
      const step = Math.max(1, Math.floor(regionData.length / samplesPerRegion));
      for (let i = 0; i < regionData.length && sampled.filter(d => d.region === region).length < samplesPerRegion; i += step) {
        sampled.push(regionData[i]);
      }
    });

    return sampled.sort((a, b) => (a.year || 0) - (b.year || 0));
  }, [allData]);

  const validDataCount = useMemo(() => allData.filter(d => d.year !== null).length, [allData]);

  const imageCoverage = stats ? Math.round((stats.signsWithImages / stats.totalSigns) * 100) : 0;
  const catalogLinkage = stats ? Math.round((stats.graphemesLinkedToCatalog / stats.totalGraphemes) * 100) : 0;
  const datesCoverage = stats ? Math.round((stats.blocksWithDates / stats.totalBlocks) * 100) : 0;
  const translationsCoverage = stats ? Math.round((stats.blocksWithTranslations / stats.totalBlocks) * 100) : 0;
  const thompsonPercentage = stats ? Math.round((stats.thompsonCoverage / stats.totalSigns) * 100) : 0;

  const displayPeriods = useMemo(() => TIME_PERIODS.filter(p => p.name !== 'Invalid/Undated'), []);

  return (
    <div className="bg-white p-6 max-md:p-4">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Research</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <div className="loading-spinner mb-4"></div>
            <p className="text-gray-500 text-sm">Loading research data...</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 gap-4 mb-6">
              <StatCard value={stats.totalSigns.toLocaleString()} label="Catalog Signs" meta={`${imageCoverage}% with images`} />
              <StatCard value={stats.totalBlocks.toLocaleString()} label="Glyph Blocks" meta={`${datesCoverage}% dated`} />
              <StatCard value={stats.totalGraphemes.toLocaleString()} label="Graphemes" meta={`${catalogLinkage}% linked`} />
              <StatCard value={stats.totalRoboflow.toLocaleString()} label="ML Annotations" />
              {stats.totalKerr > 0 && (
                <StatCard value={stats.totalKerr.toLocaleString()} label="Kerr Vessels" meta="Rollout photos" />
              )}
              {stats.totalCmhiDrawings > 0 && (
                <StatCard value={`${stats.totalCmhiDrawings}+${stats.totalCmhiPhotos}`} label="CMHI Images" meta="Drawings + photos" />
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center mb-6 flex-wrap">
              <select className={selectClass} value={dataSource} onChange={(e) => setDataSource(e.target.value as AnalyticsDataSource)}>
                <option value="mhd">MHD</option>
                <option value="roboflow">Roboflow</option>
                <option value="both">Combined</option>
              </select>
              <select className={selectClass} value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                <option value="all">All Periods</option>
                {TIME_PERIODS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <select className={selectClass} value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                <option value="all">All Regions</option>
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500 ml-auto">{allData.length.toLocaleString()} instances</span>
            </div>

            {/* Timeline */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex w-full h-6 mb-4 rounded overflow-hidden">
                {displayPeriods.map((period) => (
                  <div
                    key={period.name}
                    className="flex items-center justify-center"
                    style={{ backgroundColor: period.color, flex: period.end - period.start }}
                    title={period.name}
                  >
                    <span className="text-[10px] font-semibold text-black/70 whitespace-nowrap px-0.5">{period.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 50, left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    dataKey="year"
                    stroke="#e5e7eb"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: 'Year (CE)', position: 'bottom', offset: 15, fill: '#6b7280' }}
                    domain={[-400, 1200]}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[-0.5, 5.5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tickFormatter={(value: number) => {
                      const labels = ['Unknown', 'South', 'Usmacinta', 'Central', 'East', 'North'];
                      return labels[value] || '';
                    }}
                    stroke="#e5e7eb"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    width={65}
                  />
                  <Tooltip content={<OptimizedTooltip />} cursor={{ strokeDasharray: '3 3' }} animationDuration={0} />
                  <Scatter
                    data={sampledTimelineData.map(d => ({ ...d, y: getRegionYPosition(d.region) }))}
                    fill="#8884d8"
                    isAnimationActive={false}
                    shape="circle"
                  >
                    {sampledTimelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#6b7280'} opacity={0.7} r={4} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              {/* Region legend */}
              <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                {Object.entries(REGION_COLORS).map(([region, color]) => (
                  <div key={region} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                    <span>{region}</span>
                  </div>
                ))}
              </div>

              {validDataCount > 2000 && (
                <div className="mt-3 py-2 px-3 bg-blue-50 border border-blue-100 rounded text-blue-700 text-xs flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>Showing {sampledTimelineData.length.toLocaleString()} samples from {validDataCount.toLocaleString()} dated instances</span>
                </div>
              )}
            </div>

            {/* Two-column: Regional + Quality */}
            <div className="grid grid-cols-2 max-md:grid-cols-1 gap-6 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Regional Distribution</h2>
                <div className="flex flex-col gap-1">
                  {Object.entries(stats.signsByRegion)
                    .sort(([, a], [, b]) => b - a)
                    .map(([region, count]) => {
                      const percentage = (count / stats.totalGraphemes) * 100;
                      return <RegionBar key={region} region={region} count={count} percentage={percentage} />;
                    })}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Data Quality</h2>
                <div className="flex flex-col gap-3">
                  <QualityBar label="Sign Images" percentage={imageCoverage} />
                  <QualityBar label="Catalog Linkage" percentage={catalogLinkage} />
                  <QualityBar label="Dated Blocks" percentage={datesCoverage} />
                  <QualityBar label="Translations" percentage={translationsCoverage} />
                  <QualityBar label="Thompson Codes" percentage={thompsonPercentage} />
                </div>
              </div>
            </div>

            {/* Concordance Coverage */}
            {stats.entriesPerCatalog && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Concordance Coverage</h2>
                <div className="grid grid-cols-3 max-md:grid-cols-2 gap-3 mb-4">
                  {Object.entries(stats.entriesPerCatalog).map(([catalog, count]) => (
                    <div key={catalog} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{count.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{catalog}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-4">
                  {stats.totalConcordanceLinks != null && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{stats.totalConcordanceLinks.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Concordance Links</div>
                    </div>
                  )}
                  {stats.totalGraphs != null && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{stats.totalGraphs.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Graph Variants</div>
                    </div>
                  )}
                  {stats.totalBlockSignSlots != null && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{stats.totalBlockSignSlots.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Block Sign Slots</div>
                    </div>
                  )}
                  {stats.blocksWithGregorian != null && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{stats.blocksWithGregorian.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Blocks with Gregorian Date</div>
                    </div>
                  )}
                </div>
                {stats.correspondenceBreakdown && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Correspondence Types</div>
                    <div className="flex gap-3 flex-wrap text-sm">
                      {Object.entries(stats.correspondenceBreakdown).map(([type, count]) => (
                        <span key={type} className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                          <span className="font-medium">{type === 'exact' ? '=' : type === 'approximate' ? '\u2248' : type}</span>{' '}
                          {count.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {stats.slotCertaintyBreakdown && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Slot Certainty</div>
                    <div className="flex gap-3 flex-wrap text-sm">
                      {Object.entries(stats.slotCertaintyBreakdown).map(([type, count]) => (
                        <span key={type} className={`px-2 py-1 rounded ${
                          type === 'certain' ? 'bg-green-50 text-green-700' :
                          type === 'uncertain' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {type}: {count.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {stats.mhdVariants != null && stats.mhdParents != null && (
                  <div className="text-sm text-gray-600">
                    MHD hierarchy: <span className="font-medium text-gray-900">{stats.mhdParents.toLocaleString()}</span> parent entries, <span className="font-medium text-gray-900">{stats.mhdVariants.toLocaleString()}</span> variants
                  </div>
                )}
              </div>
            )}

            {/* Top sites table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Top Archaeological Sites</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 bg-gray-50 text-gray-500 text-xs uppercase font-medium tracking-wide">Rank</th>
                    <th className="text-left px-4 py-2.5 bg-gray-50 text-gray-500 text-xs uppercase font-medium tracking-wide">Site</th>
                    <th className="text-right px-4 py-2.5 bg-gray-50 text-gray-500 text-xs uppercase font-medium tracking-wide">Instances</th>
                    <th className="text-right px-4 py-2.5 bg-gray-50 text-gray-500 text-xs uppercase font-medium tracking-wide">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topSites.map((site, idx) => (
                    <tr key={site.site} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 font-medium">#{idx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{site.site}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-right">{site.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-right">{((site.count / stats.totalGraphemes) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
