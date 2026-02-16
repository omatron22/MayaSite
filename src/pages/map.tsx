import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllUniqueSites } from '../lib/sites';
import type { Site } from '../lib/sites';
import { REGION_COLORS } from '../lib/constants';

interface MapSite {
  name: string;
  region: string;
  blockCount: number;
  artifactCount: number;
  artifactCodes: string;
}

const CENTER: [number, number] = [17.5, -89.5];
const DEFAULT_ZOOM = 7;

const selectClass = "py-2 pr-8 pl-3 bg-white text-gray-700 border border-gray-300 rounded-md text-sm cursor-pointer transition-colors appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%236b7280%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat bg-[length:1rem] hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function MapPage() {
  const [apiSites, setApiSites] = useState<MapSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const localSites = useMemo(() => getAllUniqueSites(), []);

  useEffect(() => {
    fetch('/api/map/sites')
      .then(r => r.json())
      .then(data => setApiSites(data.sites || []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load map data'))
      .finally(() => setLoading(false));
  }, []);

  const markers = useMemo(() => {
    const merged: Array<Site & { blockCount: number; artifactCount: number; artifactCodes: string }> = [];

    for (const apiSite of apiSites) {
      const local = localSites.get(apiSite.name);
      if (local) {
        merged.push({ ...local, blockCount: apiSite.blockCount, artifactCount: apiSite.artifactCount, artifactCodes: apiSite.artifactCodes });
      }
    }

    for (const [name, site] of localSites) {
      if (!merged.some(m => m.name === name)) {
        merged.push({ ...site, blockCount: 0, artifactCount: 0, artifactCodes: '' });
      }
    }

    if (selectedRegion !== 'all') {
      return merged.filter(s => s.region === selectedRegion);
    }
    return merged;
  }, [apiSites, localSites, selectedRegion]);

  const maxCount = useMemo(() => Math.max(1, ...markers.map(m => m.blockCount)), [markers]);

  return (
    <div className="flex flex-col">
      <div className="p-6 max-md:p-4 pb-0">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 mb-0.5">Archaeological Sites</h1>
              <p className="text-sm text-gray-500">{markers.length} sites mapped</p>
            </div>
            <select className={selectClass} value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="all">All Regions</option>
              {Object.keys(REGION_COLORS).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{region}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] bg-white/80">
            <div className="loading-spinner"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-[500]">
            <div className="text-center text-red-600">
              <p className="mb-4">{error}</p>
              <button className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50" onClick={() => window.location.reload()}>Retry</button>
            </div>
          </div>
        )}

        <MapContainer
          center={CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full min-h-[500px]"
          style={{ background: '#f8fafc' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markers.map((site) => {
            const radius = Math.max(5, Math.min(25, 5 + (site.blockCount / maxCount) * 20));
            const color = REGION_COLORS[site.region] || REGION_COLORS['Unknown'];

            return (
              <CircleMarker
                key={site.name}
                center={[site.lat, site.lng]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1.5, opacity: 0.8 }}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <div className="font-bold text-base mb-1">{site.name}</div>
                    <div className="text-gray-500 mb-2">{site.region} &middot; {site.country || 'Unknown'}</div>
                    {site.blockCount > 0 && (
                      <div className="flex flex-col gap-1 text-xs border-t pt-2">
                        <span><strong>{site.blockCount.toLocaleString()}</strong> blocks</span>
                        <span><strong>{site.artifactCount}</strong> artifacts</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
