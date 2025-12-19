// src/pages/stats.tsx
import { useState, useEffect } from 'react';
import { db } from '../lib/db';
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
  signsByRegion: Record<string, number>;
  topSites: Array<{ site: string; count: number }>;
  thompsonCoverage: number;
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const signsResult = await db.execute('SELECT COUNT(*) as count FROM catalog_signs');
      const totalSigns = Number(signsResult.rows[0].count);

      const imagesResult = await db.execute(`
        SELECT COUNT(*) as count FROM catalog_signs 
        WHERE primary_image_url IS NOT NULL AND primary_image_url != ''
      `);
      const signsWithImages = Number(imagesResult.rows[0].count);

      const blocksResult = await db.execute('SELECT COUNT(*) as count FROM blocks');
      const totalBlocks = Number(blocksResult.rows[0].count);

      const graphemesResult = await db.execute('SELECT COUNT(*) as count FROM graphemes');
      const totalGraphemes = Number(graphemesResult.rows[0].count);

      const roboflowResult = await db.execute('SELECT COUNT(*) as count FROM roboflow_instances');
      const totalRoboflow = Number(roboflowResult.rows[0].count);

      const linkedResult = await db.execute(`
        SELECT COUNT(*) as count FROM graphemes WHERE catalog_sign_id IS NOT NULL
      `);
      const graphemesLinkedToCatalog = Number(linkedResult.rows[0].count);

      const datesResult = await db.execute(`
        SELECT COUNT(*) as count FROM blocks 
        WHERE event_calendar IS NOT NULL AND event_calendar != '' AND event_calendar != '-'
      `);
      const blocksWithDates = Number(datesResult.rows[0].count);

      const translationsResult = await db.execute(`
        SELECT COUNT(*) as count FROM blocks 
        WHERE block_english IS NOT NULL AND block_english != '' AND block_english != '_'
      `);
      const blocksWithTranslations = Number(translationsResult.rows[0].count);

      const thompsonResult = await db.execute(`
        SELECT COUNT(*) as count FROM catalog_signs 
        WHERE thompson_code IS NOT NULL AND thompson_code != ''
      `);
      const thompsonCoverage = Number(thompsonResult.rows[0].count);

      const regionResult = await db.execute(`
        SELECT b.region, COUNT(*) as count
        FROM graphemes g
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE b.region IS NOT NULL AND b.region != ''
        GROUP BY b.region
        ORDER BY count DESC
      `);
      const signsByRegion: Record<string, number> = {};
      regionResult.rows.forEach((row: any) => {
        signsByRegion[row.region] = Number(row.count);
      });

      const sitesResult = await db.execute(`
        SELECT b.site_name, COUNT(*) as count
        FROM graphemes g
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE b.site_name IS NOT NULL AND b.site_name != ''
        GROUP BY b.site_name
        ORDER BY count DESC
        LIMIT 15
      `);
      const topSites = sitesResult.rows.map((row: any) => ({
        site: String(row.site_name),
        count: Number(row.count)
      }));

      setStats({
        totalSigns,
        signsWithImages,
        totalBlocks,
        totalGraphemes,
        totalRoboflow,
        graphemesLinkedToCatalog,
        blocksWithDates,
        blocksWithTranslations,
        signsByRegion,
        topSites,
        thompsonCoverage
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-container">
          <div className="loading-compact">
            <div className="spinner"></div>
            <p>Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-page">
        <div className="stats-container">
          <div className="error">Failed to load statistics</div>
        </div>
      </div>
    );
  }

  const imageCoverage = Math.round((stats.signsWithImages / stats.totalSigns) * 100);
  const catalogLinkage = Math.round((stats.graphemesLinkedToCatalog / stats.totalGraphemes) * 100);
  const datesCoverage = Math.round((stats.blocksWithDates / stats.totalBlocks) * 100);
  const translationsCoverage = Math.round((stats.blocksWithTranslations / stats.totalBlocks) * 100);

  return (
    <div className="stats-page">
      <div className="stats-container">
        <div className="stats-header-compact">
          <h1>Statistics</h1>
          <p>Database coverage and quality metrics</p>
        </div>

        {/* Overview Cards */}
        <section className="stats-section">
          <h2>Dataset Overview</h2>
          <div className="stats-grid-compact">
            <div className="stat-card-compact">
              <div className="stat-value-compact">{stats.totalSigns.toLocaleString()}</div>
              <div className="stat-label-compact">Catalog Signs</div>
              <div className="stat-meta-compact">{imageCoverage}% with images</div>
            </div>
            <div className="stat-card-compact">
              <div className="stat-value-compact">{stats.totalBlocks.toLocaleString()}</div>
              <div className="stat-label-compact">Glyph Blocks</div>
              <div className="stat-meta-compact">{datesCoverage}% dated</div>
            </div>
            <div className="stat-card-compact">
              <div className="stat-value-compact">{stats.totalGraphemes.toLocaleString()}</div>
              <div className="stat-label-compact">Graphemes</div>
              <div className="stat-meta-compact">{catalogLinkage}% linked</div>
            </div>
            <div className="stat-card-compact highlight">
              <div className="stat-value-compact">{stats.totalRoboflow.toLocaleString()}</div>
              <div className="stat-label-compact">ML Annotations</div>
              <div className="stat-meta-compact">Training data</div>
            </div>
          </div>
        </section>

        {/* Data Quality */}
        <section className="stats-section">
          <h2>Data Quality</h2>
          <div className="quality-grid-compact">
            <div className="quality-item-compact">
              <div className="quality-row">
                <span className="quality-label-compact">Sign Images</span>
                <span className="quality-percent-compact">{imageCoverage}%</span>
              </div>
              <div className="progress-bar-compact">
                <div className="progress-fill-compact" style={{ width: `${imageCoverage}%` }}></div>
              </div>
            </div>

            <div className="quality-item-compact">
              <div className="quality-row">
                <span className="quality-label-compact">Catalog Linkage</span>
                <span className="quality-percent-compact">{catalogLinkage}%</span>
              </div>
              <div className="progress-bar-compact">
                <div className="progress-fill-compact" style={{ width: `${catalogLinkage}%` }}></div>
              </div>
            </div>

            <div className="quality-item-compact">
              <div className="quality-row">
                <span className="quality-label-compact">Dated Blocks</span>
                <span className="quality-percent-compact">{datesCoverage}%</span>
              </div>
              <div className="progress-bar-compact">
                <div className="progress-fill-compact" style={{ width: `${datesCoverage}%` }}></div>
              </div>
            </div>

            <div className="quality-item-compact">
              <div className="quality-row">
                <span className="quality-label-compact">Translations</span>
                <span className="quality-percent-compact">{translationsCoverage}%</span>
              </div>
              <div className="progress-bar-compact">
                <div className="progress-fill-compact" style={{ width: `${translationsCoverage}%` }}></div>
              </div>
            </div>

            <div className="quality-item-compact">
              <div className="quality-row">
                <span className="quality-label-compact">Thompson Codes</span>
                <span className="quality-percent-compact">
                  {Math.round((stats.thompsonCoverage / stats.totalSigns) * 100)}%
                </span>
              </div>
              <div className="progress-bar-compact">
                <div className="progress-fill-compact" style={{ width: `${(stats.thompsonCoverage / stats.totalSigns) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Regional Distribution */}
        <section className="stats-section">
          <h2>Regional Distribution</h2>
          <div className="bar-chart-compact">
            {Object.entries(stats.signsByRegion)
              .sort(([, a], [, b]) => b - a)
              .map(([region, count]) => {
                const percentage = (count / stats.totalGraphemes) * 100;
                return (
                  <div key={region} className="bar-row-compact">
                    <div className="bar-label-compact">{region}</div>
                    <div className="bar-container-compact">
                      <div 
                        className="bar-fill-compact" 
                        style={{ 
                          width: `${percentage}%`,
                          background: getRegionColor(region)
                        }}
                      />
                    </div>
                    <div className="bar-value-compact">{count.toLocaleString()}</div>
                    <div className="bar-percent-compact">{percentage.toFixed(1)}%</div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Top Sites */}
        <section className="stats-section">
          <h2>Top Sites</h2>
          <div className="table-wrapper">
            <table className="stats-table-compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Site</th>
                  <th>Instances</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSites.map((site, idx) => (
                  <tr key={site.site}>
                    <td className="rank-cell">{idx + 1}</td>
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
        </section>
      </div>
    </div>
  );
}

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
