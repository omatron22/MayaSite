// src/pages/analytics.tsx - OPTIMIZED WITH SMOOTH TIMELINE
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { db } from '../lib/db';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLazyLoad } from '../hooks/useLazyLoad';
import { LazyImage } from '../components/LazyImage';
import { Info } from 'lucide-react';
import './analytics.css';

const REGION_COLORS = {
  'North': '#f59e0b',
  'East': '#3b82f6', 
  'Central': '#10b981',
  'Usmacinta': '#06b6d4',
  'South': '#ec4899',
  'Unknown': '#6b7280',
  'Roboflow': '#a78bfa'
} as const;

const TIME_PERIODS = [
  { name: 'Early Preclassic', start: -2000, end: -1000, color: '#6b7280' },
  { name: 'Middle Preclassic', start: -1000, end: -400, color: '#78866b' },
  { name: 'Late Preclassic', start: -400, end: 100, color: '#94a344' },
  { name: 'Terminal Preclassic', start: 100, end: 250, color: '#b8b85f' },
  { name: 'Early Classic', start: 250, end: 550, color: '#d4c95d' },
  { name: 'Late Classic', start: 550, end: 830, color: '#e6d45c' },
  { name: 'Terminal Classic', start: 830, end: 950, color: '#f5a623' },
  { name: 'Early Postclassic', start: 950, end: 1200, color: '#d97d42' },
  { name: 'Late Postclassic', start: 1200, end: 1540, color: '#c46a3a' },
  { name: 'Invalid/Undated', start: 0, end: 0, color: '#4b5563' }
] as const;

const REGIONS = ['North', 'East', 'Central', 'Usmacinta', 'South', 'Unknown'] as const;

type ViewMode = 'timeline' | 'mosaic' | 'regional';
type DataSource = 'mhd' | 'roboflow' | 'both';

interface GlyphInstance {
  id: string;
  sign: string;
  syllabic: string;
  imageUrl: string;
  longCount: string;
  year: number | null;
  region: string;
  site: string;
  period: string;
  source: 'mhd' | 'roboflow';
}

// Utility functions
const parseLongCount = (longCount: string): number | null => {
  if (!longCount || longCount === '-') return null;
  
  const cleaned = longCount.replace(/^-/, '').replace(/\?/g, '');
  const match = cleaned.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  
  const [_, baktun, katun, tun, uinal, kin] = match.map(Number);
  const totalDays = (baktun * 144000) + (katun * 7200) + (tun * 360) + (uinal * 20) + kin;
  const ceYear = Math.round(-3114 + (totalDays / 365.25));
  
  return (ceYear < -3000 || ceYear > 2000) ? null : ceYear;
};

const getTimePeriod = (year: number | null): string => {
  if (year === null) return 'Invalid/Undated';
  
  for (const period of TIME_PERIODS) {
    if (period.name === 'Invalid/Undated') continue;
    if (year >= period.start && year < period.end) return period.name;
  }
  return 'Invalid/Undated';
};

const getRegionYPosition = (region: string): number => {
  const positions: Record<string, number> = {
    'North': 5, 'East': 4, 'Central': 3, 'Usmacinta': 2, 'South': 1, 'Unknown': 0
  };
  return positions[region] || 0;
};

// Memoized Glyph Card Component with Lazy Image
const GlyphCard = memo(({ item, onClick }: { item: GlyphInstance; onClick: (item: GlyphInstance) => void }) => {
  const handleClick = useCallback(() => onClick(item), [item, onClick]);
  
  return (
    <div 
      className={`glyph-card ${item.source === 'roboflow' ? 'roboflow-card' : ''}`}
      onClick={handleClick}
    >
      <LazyImage src={item.imageUrl} alt={item.sign} width={65} height={65} />
      <div className="glyph-info">
        <div className="sign-name">{item.sign}</div>
        {item.year && <div className="year-small">{item.year} CE</div>}
      </div>
    </div>
  );
});
GlyphCard.displayName = 'GlyphCard';

// Lazy-loaded Period Section
const PeriodSection = memo(({ 
  periodName, 
  items, 
  periodColor, 
  onGlyphClick 
}: { 
  periodName: string;
  items: GlyphInstance[];
  periodColor: string;
  onGlyphClick: (item: GlyphInstance) => void;
}) => {
  const {
    visibleItems,
    hasMore,
    loaderRef,
    isLoadingMore,
    displayCount,
    totalCount
  } = useLazyLoad(items, 100, 50);

  if (items.length === 0) return null;

  return (
    <div className="period-section-compact">
      <div className="period-header" style={{ borderLeftColor: periodColor }}>
        <h3>{periodName}</h3>
        <span className="count-badge-compact">
          {displayCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      </div>
      <div className="glyph-grid-compact">
        {visibleItems.map((item) => (
          <GlyphCard key={item.id} item={item} onClick={onGlyphClick} />
        ))}
      </div>
      
      {hasMore && (
        <div ref={loaderRef} className="load-more-trigger">
          {isLoadingMore ? (
            <div className="loading-more">
              <div className="spinner-small"></div>
              <span>Loading more...</span>
            </div>
          ) : (
            <div className="load-more-message">Scroll for more</div>
          )}
        </div>
      )}
    </div>
  );
});
PeriodSection.displayName = 'PeriodSection';

// Regional Strip with Lazy Loading
const RegionalStrip = memo(({ 
  regionName, 
  items, 
  onGlyphClick 
}: { 
  regionName: string;
  items: GlyphInstance[];
  onGlyphClick: (item: GlyphInstance) => void;
}) => {
  const {
    visibleItems,
    hasMore,
    loaderRef,
    displayCount,
    totalCount
  } = useLazyLoad(items, 50, 30);

  if (items.length === 0) return null;

  return (
    <div className="region-strip-compact">
      <div className="strip-header-compact">
        <div 
          className="region-badge"
          style={{ 
            backgroundColor: REGION_COLORS[regionName as keyof typeof REGION_COLORS] || '#6b7280'
          }}
        >
          {regionName}
        </div>
        <span className="strip-count">
          {displayCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      </div>
      <div className="strip-scroll-compact">
        {visibleItems.map((item) => (
          <StripItem key={item.id} item={item} onClick={onGlyphClick} />
        ))}
        {hasMore && (
          <div ref={loaderRef} className="strip-loader">
            <div className="spinner-small"></div>
          </div>
        )}
      </div>
    </div>
  );
});
RegionalStrip.displayName = 'RegionalStrip';

// Strip Item with Lazy Image
const StripItem = memo(({ item, onClick }: { item: GlyphInstance; onClick: (item: GlyphInstance) => void }) => {
  const handleClick = useCallback(() => onClick(item), [item, onClick]);
  
  return (
    <div 
      className={`strip-item ${item.source === 'roboflow' ? 'roboflow-item' : ''}`}
      onClick={handleClick}
    >
      <LazyImage src={item.imageUrl} alt={item.sign} width={65} height={65} />
      <div className="strip-label">
        <div className="strip-sign">{item.sign}</div>
        {item.year && <div className="strip-year">{item.year}</div>}
      </div>
    </div>
  );
});
StripItem.displayName = 'StripItem';

// OPTIMIZED Tooltip - No images for performance
const OptimizedTooltip = memo(({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip-fast">
      <div className={`tooltip-badge ${d.source}`}>
        {d.source === 'mhd' ? 'MHD' : 'Roboflow'}
      </div>
      <div className="tooltip-sign-large">{d.sign}</div>
      {d.syllabic && <div className="tooltip-syllabic">{d.syllabic}</div>}
      <div className="tooltip-info-fast">
        <div><strong>Year:</strong> {d.year ? `~${d.year} CE` : 'Undated'}</div>
        <div><strong>Region:</strong> {d.region}</div>
        <div><strong>Site:</strong> {d.site}</div>
        {d.longCount !== 'N/A' && <div><strong>LC:</strong> {d.longCount}</div>}
      </div>
    </div>
  );
});
OptimizedTooltip.displayName = 'OptimizedTooltip';

export function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('mosaic');
  const [dataSource, setDataSource] = useState<DataSource>('mhd');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<GlyphInstance[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedGlyph, setSelectedGlyph] = useState<GlyphInstance | null>(null);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    let filtered = allData;

    if (selectedPeriod !== 'all') {
      filtered = filtered.filter(d => d.period === selectedPeriod);
    }

    if (selectedRegion !== 'all') {
      filtered = filtered.filter(d => d.region === selectedRegion);
    }

    return filtered;
  }, [allData, selectedPeriod, selectedRegion]);

  // OPTIMIZED timeline data - 2000 max for smooth performance
  const sampledTimelineData = useMemo(() => {
    const validData = filteredData.filter(d => d.year !== null);
    
    // If small dataset, show all
    if (validData.length <= 2000) return validData;
    
    // Smart sampling: 2000 points distributed evenly across regions
    const sampleSize = 2000;
    const samplesPerRegion = Math.floor(sampleSize / REGIONS.length);
    const sampled: GlyphInstance[] = [];
    
    REGIONS.forEach(region => {
      const regionData = validData.filter(d => d.region === region);
      if (regionData.length === 0) return;
      
      // Take evenly distributed samples
      const step = Math.max(1, Math.floor(regionData.length / samplesPerRegion));
      
      for (let i = 0; i < regionData.length && sampled.filter(d => d.region === region).length < samplesPerRegion; i += step) {
        sampled.push(regionData[i]);
      }
    });
    
    return sampled.sort((a, b) => (a.year || 0) - (b.year || 0));
  }, [filteredData]);

  // Memoized grouped data
  const groupedByPeriod = useMemo(() => {
    const grouped: Record<string, GlyphInstance[]> = {};
    const periods = dataSource === 'roboflow' || dataSource === 'both'
      ? [...TIME_PERIODS, { name: 'Roboflow Dataset', start: 0, end: 0, color: '#a78bfa' }]
      : TIME_PERIODS;
    
    periods.forEach(period => {
      grouped[period.name] = filteredData.filter(d => d.period === period.name);
    });
    
    return grouped;
  }, [filteredData, dataSource]);

  const groupedByRegion = useMemo(() => {
    const grouped: Record<string, GlyphInstance[]> = {};
    const regions = dataSource === 'roboflow' || dataSource === 'both' 
      ? [...REGIONS, 'Roboflow'] 
      : REGIONS;
    
    regions.forEach(region => {
      grouped[region] = filteredData.filter(d => d.region === region);
    });
    
    return grouped;
  }, [filteredData, dataSource]);

  // Memoized statistics
  const stats = useMemo(() => ({
    validDataCount: filteredData.filter(d => d.year !== null).length,
    invalidDataCount: filteredData.filter(d => d.year === null).length,
    mhdCount: filteredData.filter(d => d.source === 'mhd').length,
    roboflowCount: filteredData.filter(d => d.source === 'roboflow').length,
  }), [filteredData]);

  const displayPeriods = useMemo(() => 
    TIME_PERIODS.filter(p => p.name !== 'Invalid/Undated'),
    []
  );

  // Callbacks
  const handleGlyphClick = useCallback((glyph: GlyphInstance) => {
    setSelectedGlyph(glyph);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedGlyph(null);
  }, []);

  // Data loading effect
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        let allInstances: GlyphInstance[] = [];

        // Load MHD data
        if (dataSource === 'mhd' || dataSource === 'both') {
          const countResult = await db.execute(`
            SELECT COUNT(*) as total
            FROM graphemes g
            INNER JOIN blocks b ON g.block_id = b.id
            INNER JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
            WHERE b.event_long_count IS NOT NULL
              AND b.event_long_count != '-'
              AND cs.primary_image_url IS NOT NULL
              AND cs.graphcode IS NOT NULL
          `);
          
          const total = Number(countResult.rows[0].total);
          console.log(`📊 Total MHD instances: ${total.toLocaleString()}`);

          const batchSize = 20000;
          let offset = 0;

          while (offset < total) {
            console.log(`Loading MHD batch ${offset}-${offset + batchSize}...`);
            
            const batchResult = await db.execute(`
              SELECT 
                g.id,
                cs.graphcode,
                cs.syllabic_value,
                cs.primary_image_url,
                b.event_long_count,
                b.region,
                b.site_name,
                b.artifact_code
              FROM graphemes g
              INNER JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
              INNER JOIN blocks b ON g.block_id = b.id
              WHERE b.event_long_count IS NOT NULL
                AND b.event_long_count != '-'
                AND cs.graphcode IS NOT NULL
                AND cs.primary_image_url IS NOT NULL
              LIMIT ${batchSize} OFFSET ${offset}
            `);

            const batchProcessed = batchResult.rows.map((row: any) => {
              const year = parseLongCount(String(row.event_long_count));
              
              return {
                id: `mhd-${row.id}`,
                sign: String(row.graphcode || 'Unknown'),
                syllabic: String(row.syllabic_value || ''),
                imageUrl: row.primary_image_url,
                longCount: String(row.event_long_count),
                year,
                region: String(row.region || 'Unknown'),
                site: String(row.site_name || row.artifact_code || 'Unknown'),
                period: getTimePeriod(year),
                source: 'mhd' as const
              };
            });

            allInstances.push(...batchProcessed);
            offset += batchSize;

            if (batchResult.rows.length < batchSize) break;
          }
        }

        // Load Roboflow data
        if (dataSource === 'roboflow' || dataSource === 'both') {
          console.log('Loading Roboflow instances...');
          const roboflowResult = await db.execute(`
            SELECT 
              r.id,
              r.image_url,
              r.confidence,
              r.dataset_split,
              cs.graphcode,
              cs.syllabic_value
            FROM roboflow_instances r
            INNER JOIN catalog_signs cs ON r.catalog_sign_id = cs.id
            WHERE cs.graphcode IS NOT NULL
          `);

          const roboflowInstances = roboflowResult.rows.map((row: any) => ({
            id: `roboflow-${row.id}`,
            sign: String(row.graphcode || 'Unknown'),
            syllabic: String(row.syllabic_value || ''),
            imageUrl: row.image_url,
            longCount: 'N/A',
            year: null,
            region: 'Roboflow',
            site: `Annotated (${row.dataset_split || 'unknown'})`,
            period: 'Roboflow Dataset',
            source: 'roboflow' as const
          }));

          allInstances.push(...roboflowInstances);
          console.log(`✅ Loaded ${roboflowInstances.length.toLocaleString()} Roboflow instances`);
        }

        allInstances.sort((a, b) => {
          if (a.year === null && b.year === null) return 0;
          if (a.year === null) return 1;
          if (b.year === null) return -1;
          return a.year - b.year;
        });
        
        console.log(`✅ Loaded ${allInstances.length.toLocaleString()} total instances`);
        setAllData(allInstances);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [dataSource]);

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        {/* Compact Header */}
        <div className="page-header-compact">
          <h1>Analytics</h1>
          <div className="header-stats">
            {allData.length > 0 && (
              <>
                <span className="stat-compact"><strong>{allData.length.toLocaleString()}</strong> total</span>
                <span className="stat-divider">•</span>
                <span className="stat-compact"><strong>{stats.mhdCount.toLocaleString()}</strong> MHD</span>
                <span className="stat-divider">•</span>
                <span className="stat-compact"><strong>{stats.roboflowCount.toLocaleString()}</strong> Roboflow</span>
              </>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="controls-row">
          <div className="view-toggle-compact">
            <button 
              className={viewMode === 'timeline' ? 'active' : ''} 
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button 
              className={viewMode === 'mosaic' ? 'active' : ''} 
              onClick={() => setViewMode('mosaic')}
            >
              Mosaic
            </button>
            <button 
              className={viewMode === 'regional' ? 'active' : ''} 
              onClick={() => setViewMode('regional')}
            >
              Regional
            </button>
          </div>

          <div className="filters-row-compact">
            <select className="filter-select-sm" value={dataSource} onChange={(e) => setDataSource(e.target.value as DataSource)}>
              <option value="mhd">MHD</option>
              <option value="roboflow">Roboflow</option>
              <option value="both">Combined</option>
            </select>
            
            <select className="filter-select-sm" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="all">All Periods</option>
              {TIME_PERIODS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
              {(dataSource === 'roboflow' || dataSource === 'both') && (
                <option value="Roboflow Dataset">Roboflow Dataset</option>
              )}
            </select>
            
            <select className="filter-select-sm" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="all">All Regions</option>
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              {(dataSource === 'roboflow' || dataSource === 'both') && (
                <option value="Roboflow">Roboflow</option>
              )}
            </select>

            <div className="results-count-compact">
              {filteredData.length.toLocaleString()} shown
            </div>
          </div>
        </div>

        {loading && (
          <div className="loading-compact">
            <div className="spinner"></div>
            <p>Loading dataset...</p>
          </div>
        )}

        {/* TIMELINE VIEW - OPTIMIZED FOR SMOOTH PERFORMANCE */}
        {!loading && viewMode === 'timeline' && (
          <div className="timeline-view">
            <div className="period-bar-compact">
              {displayPeriods.map((period) => (
                <div 
                  key={period.name}
                  className="period-segment"
                  style={{
                    backgroundColor: period.color,
                    flex: period.end - period.start
                  }}
                  title={period.name}
                >
                  <span>{period.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart 
                  margin={{ top: 10, right: 20, bottom: 60, left: 80 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#374151" 
                    opacity={0.3} 
                  />
                  
                  <XAxis 
                    type="number"
                    dataKey="year"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ 
                      value: 'Year (CE)', 
                      position: 'bottom', 
                      offset: 15, 
                      fill: '#9ca3af' 
                    }}
                    domain={[-400, 1200]}
                  />
                  
                  <YAxis 
                    type="number" 
                    dataKey="y"
                    domain={[-0.5, 5.5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tickFormatter={(value) => {
                      const labels = ['Unknown', 'South', 'Usmacinta', 'Central', 'East', 'North'];
                      return labels[value] || '';
                    }}
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    width={75}
                  />
                  
                  <Tooltip 
                    content={<OptimizedTooltip />} 
                    cursor={{ strokeDasharray: '3 3' }}
                    animationDuration={0}
                  />
                  
                  <Scatter 
                    data={sampledTimelineData.map(d => ({ 
                      ...d, 
                      y: getRegionYPosition(d.region) 
                    }))} 
                    fill="#8884d8"
                    onClick={(data: any) => handleGlyphClick(data)}
                    isAnimationActive={false}
                    shape="circle"
                  >
                    {sampledTimelineData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={REGION_COLORS[entry.region as keyof typeof REGION_COLORS] || '#6b7280'}
                        opacity={0.7}
                        r={4}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="legend-compact">
              {Object.entries(REGION_COLORS).map(([region, color]) => (
                <div key={region} className="legend-item-compact">
                  <div className="legend-dot" style={{ backgroundColor: color }}></div>
                  <span>{region}</span>
                </div>
              ))}
            </div>

            {stats.validDataCount > 2000 && (
              <div className="info-note">
                <Info size={16} />
                <span>
                  Showing {sampledTimelineData.length.toLocaleString()} representative samples 
                  from {stats.validDataCount.toLocaleString()} dated instances for optimal performance
                </span>
              </div>
            )}
          </div>
        )}

        {/* MOSAIC VIEW - OPTIMIZED WITH LAZY LOADING */}
        {!loading && viewMode === 'mosaic' && (
          <div className="mosaic-view">
            <div className="period-bar-compact">
              {displayPeriods.map((period) => (
                <div 
                  key={period.name}
                  className="period-segment"
                  style={{
                    backgroundColor: period.color,
                    flex: period.end - period.start
                  }}
                  title={period.name}
                >
                  <span>{period.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            {Object.entries(groupedByPeriod).map(([periodName, items]) => {
              const period = TIME_PERIODS.find(p => p.name === periodName);
              const periodColor = period?.color || (periodName === 'Roboflow Dataset' ? '#a78bfa' : '#6b7280');
              
              return (
                <PeriodSection
                  key={periodName}
                  periodName={periodName}
                  items={items}
                  periodColor={periodColor}
                  onGlyphClick={handleGlyphClick}
                />
              );
            })}
          </div>
        )}

        {/* REGIONAL VIEW - OPTIMIZED WITH LAZY LOADING */}
        {!loading && viewMode === 'regional' && (
          <div className="regional-view">
            {Object.entries(groupedByRegion).map(([regionName, items]) => (
              <RegionalStrip
                key={regionName}
                regionName={regionName}
                items={items}
                onGlyphClick={handleGlyphClick}
              />
            ))}
          </div>
        )}

        {!loading && filteredData.length === 0 && (
          <div className="no-data">
            <p>No instances found with current filters</p>
          </div>
        )}

        {/* GLYPH DETAIL MODAL */}
        {selectedGlyph && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>×</button>
              
              <div className={`modal-source-badge ${selectedGlyph.source}`}>
                {selectedGlyph.source === 'mhd' ? 'MHD' : 'Roboflow'}
              </div>
              
              <div className="modal-body-compact">
                <img src={selectedGlyph.imageUrl} alt={selectedGlyph.sign} />
                
                <div className="modal-details-compact">
                  <h2>{selectedGlyph.sign}</h2>
                  {selectedGlyph.syllabic && <div className="modal-syllabic">{selectedGlyph.syllabic}</div>}
                  
                  <div className="modal-info-grid">
                    {selectedGlyph.year && (
                      <div className="info-item">
                        <span className="info-label">Year</span>
                        <span className="info-value">~{selectedGlyph.year} CE</span>
                      </div>
                    )}
                    {selectedGlyph.longCount !== 'N/A' && (
                      <div className="info-item">
                        <span className="info-label">Long Count</span>
                        <span className="info-value">{selectedGlyph.longCount}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Period</span>
                      <span className="info-value">{selectedGlyph.period}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Region</span>
                      <span className="info-value" style={{ color: REGION_COLORS[selectedGlyph.region as keyof typeof REGION_COLORS] }}>
                        {selectedGlyph.region}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Site</span>
                      <span className="info-value">{selectedGlyph.site}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
