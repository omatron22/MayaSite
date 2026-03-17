import { useEffect, useState } from 'react';
import { fetchStats } from '../lib/api';
import type { StatsResponse } from '../../api/lib/types';

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}

function pct(n: number, total: number): string {
  if (!total) return '0%';
  return Math.round((n / total) * 100) + '%';
}

function AnimatedDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return <span>{'.'.repeat(dots)}<span className="invisible">{'.'.repeat(3 - dots)}</span></span>;
}

function Loading() {
  return <span>Loading<AnimatedDots /></span>;
}

const RESEARCH_RESOURCES = [
  { title: 'Introduction to Maya Hieroglyphs', desc: 'Comprehensive introduction for students and researchers', url: 'https://www.mesoweb.com/resources/handbook/IMH2020.pdf' },
  { title: 'Visual Catalog of Maya Hieroglyphs', desc: 'Tokovinine\'s illustrated reference catalog', url: 'https://www.mesoweb.com/resources/catalog/Tokovinine_Catalog.pdf' },
  { title: 'ClassicMayan Sign Catalog', desc: 'Interactive sign catalog with phonetic values and concordances across 11 catalog systems', url: 'https://classicmayan.org' },
  { title: 'Updated Maya-English Vocabulary', desc: 'Comprehensive vocabulary list for decipherment', url: 'https://www.mesoweb.com/resources/vocabulary/Vocabulary-2009.01.pdf' },
];

export function AboutPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal).then(setStats).catch(() => {});
    return () => controller.abort();
  }, []);

  const s = stats;
  const totalCmhi = s ? s.totalCmhiDrawings + s.totalCmhiPhotos : 0;
  const linkedPct = s ? pct(s.graphemesLinkedToCatalog, s.totalGraphemes) : '...';
  const unlinkedPct = s ? pct(s.totalGraphemes - s.graphemesLinkedToCatalog, s.totalGraphemes) : '...';

  const dataSources: { title: string; desc: string | React.ReactNode; url: string | null }[] = [
    { title: 'Maya Hieroglyphic Database (MHD)', desc: s ? `${fmt(s.totalSigns)} catalog signs, ${fmt(s.totalBlocks)} glyph blocks, ${fmt(s.totalGraphemes)} grapheme instances` : <Loading />, url: 'https://mayadatabase.org' },
    { title: 'LMGG Concordance Table', desc: '1,236 cross-referenced codes with TWKM, Thompson, CMGG mappings', url: 'https://mayaglyphs.org/LMGGC.html' },
    { title: 'Roboflow ML Dataset', desc: s ? `${fmt(s.totalRoboflow)} annotated glyph instances for computer vision` : <Loading />, url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k' },
    { title: 'Kerr Maya Vase Database', desc: s ? `${fmt(s.totalKerr)} vessel rollout photographs` : <Loading />, url: 'https://research.mayavase.com/kerrmaya.html' },
    { title: 'Harvard CMHI', desc: s ? `${fmt(totalCmhi)} images (${fmt(s.totalCmhiDrawings)} drawings, ${fmt(s.totalCmhiPhotos)} photos)` : <Loading />, url: 'https://peabody.harvard.edu/cmhi' },
    { title: 'Peabody Museum Site Codes', desc: '200+ site codes mapped to coordinates across 4 regions', url: 'https://peabody.harvard.edu/maya-site-codes' },
    { title: 'ClassicMayan.org (Bonn/TWKM)', desc: '1,075 signs, 1,565 graph variants, 728 decipherments (CC BY 4.0)', url: 'https://classicmayan.org' },
    { title: 'Cross-Catalog Concordance', desc: s ? `${fmt(s.totalSigns)} entries across MHD, TWKM, Thompson, and 11 other catalogs with ${pct(s.thompsonCoverage, s.totalSigns)} Thompson, ${pct(s.zenderCoverage, s.totalSigns)} Zender coverage` : <Loading />, url: null },
  ];

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      <div className="flex flex-col gap-6">

        {/* About */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">About</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">
                Maya hieroglyphs have been catalogued across multiple incompatible classification
                systems over the past century — Thompson, Macri-Vail, Zimmermann, and others.
                Researchers must cross-reference these systems manually, slowing decipherment
                and creating barriers to entry.
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm">
                This project unifies the Maya Hieroglyphic Database (MHD), the LMGG concordance,
                the ClassicMayan.org Bonn sign catalog, Kerr vase photography, Harvard CMHI drawings,
                and machine learning datasets into a single searchable interface with cross-catalog
                concordance linking.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Data Sources */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Source</th>
              <th className="px-3 py-1 text-left text-xs uppercase">Description</th>
              <th className="px-3 py-1 text-left text-xs uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((ds) => (
              <tr key={ds.title}>
                <td className="px-3 py-1 text-sm font-[800] whitespace-nowrap align-top">{ds.title}</td>
                <td className="px-3 py-1 text-xs align-top">{ds.desc}</td>
                <td className="px-3 py-1 text-xs align-top whitespace-nowrap">
                  {ds.url && (
                    <a href={ds.url} target="_blank" rel="noopener noreferrer" className="text-black underline hover:no-underline">
                      link
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Research Resources */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Resource</th>
              <th className="px-3 py-1 text-left text-xs uppercase">Description</th>
              <th className="px-3 py-1 text-left text-xs uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {RESEARCH_RESOURCES.map((r) => (
              <tr key={r.title}>
                <td className="px-3 py-1 text-sm font-[800] whitespace-nowrap align-top">{r.title}</td>
                <td className="px-3 py-1 text-xs align-top">{r.desc}</td>
                <td className="px-3 py-1 text-xs align-top">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-black underline hover:no-underline">
                    link
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Known Limitations */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Known Limitations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-1 text-xs">MHD data includes records through early 2022 and may not reflect recent discoveries.</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">{linkedPct} of graphemes linked to catalog signs. Remaining {unlinkedPct} are unidentified (code "000"), uncertain (?), or numerals.</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">737/1,075 Bonn signs matched to MHD catalog{s ? ` (${pct(s.bonnImageCoverage, s.totalSigns)} of ${fmt(s.totalSigns)} entries)` : ''}. Unmatched are mostly newer 1500+ series not in MHD.</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">Site coordinates cover 200+ archaeological sites across 4 regions using Peabody CMHI codes.</td>
            </tr>
          </tbody>
        </table>

        {/* Database Overview — at bottom */}
        {s && (
          <table className="w-auto">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase" colSpan={2}>Database</th>
                <th className="px-3 py-1 text-right text-xs">
                  {fmt(s.totalSigns + s.totalBlocks + s.totalGraphemes + s.totalRoboflow + s.totalKerr + totalCmhi)} total records
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalSigns)}</td>
                <td className="px-3 py-1 text-sm">catalog signs</td>
                <td className="px-3 py-1 text-xs">{fmt(s.signsWithImages)} with images</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalBlocks)}</td>
                <td className="px-3 py-1 text-sm">inscription blocks</td>
                <td className="px-3 py-1 text-xs">{fmt(s.blocksWithDates)} dated, {fmt(s.blocksWithTranslations)} translated</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalGraphemes)}</td>
                <td className="px-3 py-1 text-sm">grapheme instances</td>
                <td className="px-3 py-1 text-xs">{fmt(s.graphemesLinkedToCatalog)} linked to catalog</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalRoboflow)}</td>
                <td className="px-3 py-1 text-sm">ML annotations</td>
                <td className="px-3 py-1 text-xs">Roboflow detected instances</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalKerr)}</td>
                <td className="px-3 py-1 text-sm">Kerr vessels</td>
                <td className="px-3 py-1 text-xs">rollout photographs</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-sm font-[800]">{fmt(totalCmhi)}</td>
                <td className="px-3 py-1 text-sm">CMHI images</td>
                <td className="px-3 py-1 text-xs">{fmt(s.totalCmhiDrawings)} drawings, {fmt(s.totalCmhiPhotos)} photos</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Top Sites — at bottom */}
        {s && (
          <table className="w-auto">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase" colSpan={4}>Top Archaeological Sites</th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-left text-xs">#</th>
                <th className="px-3 py-1 text-left text-xs">Site</th>
                <th className="px-3 py-1 text-right text-xs">Instances</th>
                <th className="px-3 py-1 text-right text-xs">Share</th>
              </tr>
            </thead>
            <tbody>
              {s.topSites.map((site, idx) => (
                <tr key={site.site}>
                  <td className="px-3 py-1 text-sm">{idx + 1}</td>
                  <td className="px-3 py-1 text-sm font-[800]">{site.site}</td>
                  <td className="px-3 py-1 text-sm text-right">{site.count.toLocaleString()}</td>
                  <td className="px-3 py-1 text-xs text-right">{((site.count / s.totalGraphemes) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-xs italic text-center px-3 py-2">
          This project consolidates publicly available scholarly resources.
          All contributors will be credited as co-authors in resulting publications.
        </p>

      </div>
    </div>
  );
}
