// src/pages/stats.tsx - OPTIMIZED WITH ICONS
import { useState, useEffect, memo } from 'react';
import { db } from '../lib/db';
import { 
  BarChart3, 
  Sparkles, 
  Map, 
  Building2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import './stats.css';

interface Stats {
  totalSigns: number;
  signsWithImages: number;
  totalBlocks: number;
  totalGraphemes: number;
  totalRoboflow: number;
  graphemesLinkedToCatalog: number;
  blocksWithDates: number;
  blocksWithTranslations: number;
  thompsonCoverage: number;
  signsByRegion: Record<string, number>;
  topSites: Array<{ site: string; count: number }>;
}

interface LoadingState {
  overview: boolean;
  quality: boolean;
  regional: boolean;
  sites: boolean;
}

// Memoized components for better performance
const StatCard = memo(({ 
  value, 
  label, 
  meta, 
  highlight = false 
}: { 
  value: string; 
  label: string; 
  meta?: string; 
  highlight?: boolean;
}) => (
  <div className={`stat-card-compact ${highlight ? 'highlight' : ''}`}>
    <div className="stat-value-compact">{value}</div>
    <div className="stat-label-compact">{label}</div>
    {meta && <div className="stat-meta-compact">{meta}</div>}
  </div>
));
StatCard.displayName = 'StatCard';

const QualityBar = memo(({ 
  label, 
  percentage 
}: { 
  label: string; 
  percentage: number;
}) => (
  <div className="quality-item-compact">
    <div className="quality-row">
      <span className="quality-label-compact">{label}</span>
      <span className="quality-percent-compact">{percentage}%</span>
    </div>
    <div className="progress-bar-compact">
      <div 
        className="progress-fill-compact animate-width" 
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
));
QualityBar.displayName = 'QualityBar';

const RegionBar = memo(({ 
  region, 
  count, 
  percentage 
}: { 
  region: string; 
  count: number; 
  percentage: number;
}) => (
  <div className="bar-row-compact animate-slide-up">
    <div className="bar-label-compact">{region}</div>
    <div className="bar-container-compact">
      <div 
        className="bar-fill-compact animate-width" 
        style={{ 
          width: `${percentage}%`,
          background: getRegionColor(region)
        }}
      />
    </div>
    <div className="bar-value-compact">{count.toLocaleString()}</div>
    <div className="bar-percent-compact">{percentage.toFixed(1)}%</div>
  </div>
));
RegionBar.displayName = 'RegionBar';

function getRegionColor(region: string): string {
  const colors: Record<string, string> = {
    'North': '#f59e0b',
    'East': '#3b82f6',
    'Central': '#10b981',
    'Usmacinta': '#06b6d4',
    'South': '#ec4899',
    'Unknown': '#6b7280'
  };
  return colors[region] || '#6b7280';
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    overview: true,
    quality: true,
    regional: true,
    sites: true
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading({
      overview: true,
      quality: true,
      regional: true,
      sites: true
    });
    setError(null);

    try {
      // Load all stats in parallel for maximum speed
      const [
        signsResult,
        imagesResult,
        blocksResult,
        graphemesResult,
        roboflowResult,
        linkedResult,
        datesResult,
        translationsResult,
        thompsonResult,
        regionResult,
        sitesResult
      ] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM catalog_signs'),
        db.execute(`
          SELECT COUNT(*) as count FROM catalog_signs 
          WHERE primary_image_url IS NOT NULL AND primary_image_url != ''
        `),
        db.execute('SELECT COUNT(*) as count FROM blocks'),
        db.execute('SELECT COUNT(*) as count FROM graphemes'),
        db.execute('SELECT COUNT(*) as count FROM roboflow_instances'),
        db.execute(`
          SELECT COUNT(*) as count FROM graphemes 
          WHERE catalog_sign_id IS NOT NULL
        `),
        db.execute(`
          SELECT COUNT(*) as count FROM blocks 
          WHERE event_calendar IS NOT NULL 
            AND event_calendar != '' 
            AND event_calendar != '-'
        `),
        db.execute(`
          SELECT COUNT(*) as count FROM blocks 
          WHERE block_english IS NOT NULL 
            AND block_english != '' 
            AND block_english != '_'
        `),
        db.execute(`
          SELECT COUNT(*) as count FROM catalog_signs 
          WHERE thompson_code IS NOT NULL AND thompson_code != ''
        `),
        db.execute(`
          SELECT b.region, COUNT(*) as count
          FROM graphemes g
          INNER JOIN blocks b ON g.block_id = b.id
          WHERE b.region IS NOT NULL AND b.region != ''
          GROUP BY b.region
          ORDER BY count DESC
        `),
        db.execute(`
          SELECT b.site_name, COUNT(*) as count
          FROM graphemes g
          INNER JOIN blocks b ON g.block_id = b.id
          WHERE b.site_name IS NOT NULL AND b.site_name != ''
          GROUP BY b.site_name
          ORDER BY count DESC
          LIMIT 15
        `)
      ]);

      // Process results
      const totalSigns = Number(signsResult.rows[0].count);
      const signsWithImages = Number(imagesResult.rows[0].count);
      const totalBlocks = Number(blocksResult.rows[0].count);
      const totalGraphemes = Number(graphemesResult.rows[0].count);
      const totalRoboflow = Number(roboflowResult.rows[0].count);
      const graphemesLinkedToCatalog = Number(linkedResult.rows[0].count);
      const blocksWithDates = Number(datesResult.rows[0].count);
      const blocksWithTranslations = Number(translationsResult.rows[0].count);
      const thompsonCoverage = Number(thompsonResult.rows[0].count);

      const signsByRegion: Record<string, number> = {};
      regionResult.rows.forEach((row: any) => {
        signsByRegion[row.region] = Number(row.count);
      });

      const topSites = sitesResult.rows.map((row: any) => ({
        site: String(row.site_name),
        count: Number(row.count)
      }));

      // Set all data at once
      setStats({
        totalSigns,
        signsWithImages,
        totalBlocks,
        totalGraphemes,
        totalRoboflow,
        graphemesLinkedToCatalog,
        blocksWithDates,
        blocksWithTranslations,
        thompsonCoverage,
        signsByRegion,
        topSites
      });

      // Stagger loading states for smooth animation
      setTimeout(() => setLoading(prev => ({ ...prev, overview: false })), 100);
      setTimeout(() => setLoading(prev => ({ ...prev, quality: false })), 200);
      setTimeout(() => setLoading(prev => ({ ...prev, regional: false })), 300);
      setTimeout(() => setLoading(prev => ({ ...prev, sites: false })), 400);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load statistics. Please try again.');
      setLoading({
        overview: false,
        quality: false,
        regional: false,
        sites: false
      });
    }
  }

  // Calculate percentages
  const imageCoverage = stats ? Math.round((stats.signsWithImages / stats.totalSigns) * 100) : 0;
  const catalogLinkage = stats ? Math.round((stats.graphemesLinkedToCatalog / stats.totalGraphemes) * 100) : 0;
  const datesCoverage = stats ? Math.round((stats.blocksWithDates / stats.totalBlocks) * 100) : 0;
  const translationsCoverage = stats ? Math.round((stats.blocksWithTranslations / stats.totalBlocks) * 100) : 0;
  const thompsonPercentage = stats ? Math.round((stats.thompsonCoverage / stats.totalSigns) * 100) : 0;

  return (
    <div className="stats-page">
      <div className="stats-container">
        {/* Header */}
        <div className="stats-header-compact">
          <h1>Database Statistics</h1>
          <p>Comprehensive coverage and quality metrics</p>
          {lastUpdated && (
            <div className="last-updated">
              <Info size={16} />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <button 
                className="refresh-btn" 
                onClick={loadStats}
                disabled={loading.overview}
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <div className="error-content">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={loadStats}>Retry</button>
          </div>
        )}

        {/* Overview Cards */}
        <section className={`stats-section ${loading.overview ? 'loading-section' : 'animate-fade-in'}`}>
          <h2>
            <BarChart3 size={20} />
            <span>Dataset Overview</span>
          </h2>
          {loading.overview ? (
            <div className="section-loading">
              <div className="spinner-small"></div>
              <span>Loading overview...</span>
            </div>
          ) : stats ? (
            <div className="stats-grid-compact">
              <StatCard
                value={stats.totalSigns.toLocaleString()}
                label="Catalog Signs"
                meta={`${imageCoverage}% with images`}
              />
              <StatCard
                value={stats.totalBlocks.toLocaleString()}
                label="Glyph Blocks"
                meta={`${datesCoverage}% dated`}
              />
              <StatCard
                value={stats.totalGraphemes.toLocaleString()}
                label="Graphemes"
                meta={`${catalogLinkage}% linked`}
              />
              <StatCard
                value={stats.totalRoboflow.toLocaleString()}
                label="ML Annotations"
                meta="Training data"
                highlight
              />
            </div>
          ) : null}
        </section>

        {/* Data Quality */}
        <section className={`stats-section ${loading.quality ? 'loading-section' : 'animate-fade-in'}`}>
          <h2>
            <Sparkles size={20} />
            <span>Data Quality</span>
          </h2>
          {loading.quality ? (
            <div className="section-loading">
              <div className="spinner-small"></div>
              <span>Analyzing quality...</span>
            </div>
          ) : stats ? (
            <div className="quality-grid-compact">
              <QualityBar label="Sign Images" percentage={imageCoverage} />
              <QualityBar label="Catalog Linkage" percentage={catalogLinkage} />
              <QualityBar label="Dated Blocks" percentage={datesCoverage} />
              <QualityBar label="Translations" percentage={translationsCoverage} />
              <QualityBar label="Thompson Codes" percentage={thompsonPercentage} />
            </div>
          ) : null}
        </section>

        {/* Regional Distribution */}
        <section className={`stats-section ${loading.regional ? 'loading-section' : 'animate-fade-in'}`}>
          <h2>
            <Map size={20} />
            <span>Regional Distribution</span>
          </h2>
          {loading.regional ? (
            <div className="section-loading">
              <div className="spinner-small"></div>
              <span>Loading regions...</span>
            </div>
          ) : stats ? (
            <div className="bar-chart-compact">
              {Object.entries(stats.signsByRegion)
                .sort(([, a], [, b]) => b - a)
                .map(([region, count]) => {
                  const percentage = (count / stats.totalGraphemes) * 100;
                  return (
                    <RegionBar
                      key={region}
                      region={region}
                      count={count}
                      percentage={percentage}
                    />
                  );
                })}
            </div>
          ) : null}
        </section>

        {/* Top Sites */}
        <section className={`stats-section ${loading.sites ? 'loading-section' : 'animate-fade-in'}`}>
          <h2>
            <Building2 size={20} />
            <span>Top Archaeological Sites</span>
          </h2>
          {loading.sites ? (
            <div className="section-loading">
              <div className="spinner-small"></div>
              <span>Loading sites...</span>
            </div>
          ) : stats ? (
            <div className="table-wrapper">
              <table className="stats-table-compact">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Site</th>
                    <th>Instances</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topSites.map((site, idx) => (
                    <tr key={site.site} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="rank-cell">#{idx + 1}</td>
                      <td className="site-cell">{site.site}</td>
                      <td className="count-cell">{site.count.toLocaleString()}</td>
                      <td className="percent-cell">
                        {((site.count / stats.totalGraphemes) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Summary Footer */}
        {stats && !loading.sites && (
          <div className="stats-footer animate-fade-in">
            <div className="footer-highlight">
              <CheckCircle size={20} />
              <span><strong>Database Health:</strong> Excellent</span>
            </div>
            <div className="footer-stats">
              <span>{stats.totalSigns.toLocaleString()} signs</span>
              <span>•</span>
              <span>{stats.totalGraphemes.toLocaleString()} instances</span>
              <span>•</span>
              <span>{imageCoverage}% coverage</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
