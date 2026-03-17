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
  { title: 'ClassicMayan Sign Catalog', desc: 'Interactive sign catalog with phonetic values and concordances across 13 catalog systems', url: 'https://classicmayan.org' },
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
    { title: 'Maya Hieroglyphic Database (MHD)', desc: s ? `${fmt(s.totalSigns)} signs, ${fmt(s.totalBlocks)} inscription blocks, and ${fmt(s.totalGraphemes)} individual glyph occurrences from the largest Maya epigraphy database` : <Loading />, url: 'https://mayadatabase.org' },
    { title: 'LMGG Concordance Table', desc: '1,236 signs cross-referenced between Thompson, TWKM, and CMGG numbering systems — lets you look up the same sign across different catalogs', url: 'https://mayaglyphs.org/LMGGC.html' },
    { title: 'Roboflow ML Dataset', desc: s ? `${fmt(s.totalRoboflow)} machine-learning-annotated glyph images for automated sign recognition` : <Loading />, url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k' },
    { title: 'Kerr Maya Vase Database', desc: s ? `${fmt(s.totalKerr)} rollout photographs of painted Maya ceramic vessels` : <Loading />, url: 'https://research.mayavase.com/kerrmaya.html' },
    { title: 'Harvard CMHI', desc: s ? `${fmt(totalCmhi)} images from the Corpus of Maya Hieroglyphic Inscriptions — ${fmt(s.totalCmhiDrawings)} line drawings and ${fmt(s.totalCmhiPhotos)} photographs` : <Loading />, url: 'https://peabody.harvard.edu/cmhi' },
    { title: 'Peabody Museum Site Codes', desc: '200+ archaeological site abbreviations mapped to GPS coordinates across 5 Maya regions', url: 'https://peabody.harvard.edu/maya-site-codes' },
    { title: 'ClassicMayan.org (Bonn/TWKM)', desc: '1,075 signs with 1,565 visual variants and 727 proposed readings from the University of Bonn (CC BY 4.0)', url: 'https://classicmayan.org' },
    { title: 'Cross-Catalog Concordance', desc: s ? `${fmt(s.totalSigns)} entries linked across 13 catalog systems (MHD, TWKM, Thompson, CMGG, Grube, and 8 others) — ${pct(s.thompsonCoverage, s.totalSigns)} Thompson coverage, ${pct(s.zenderCoverage, s.totalSigns)} Zender coverage` : <Loading />, url: null },
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
                Maya hieroglyphs have been catalogued under multiple incompatible numbering systems
                over the past century — Thompson, Macri-Vail, Zimmermann, and others. A single glyph
                can have a different code in each system, forcing researchers to manually cross-reference
                between catalogs.
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm">
                This project brings together 8 major data sources into one searchable interface:
                the MHD epigraphy database, the Bonn/TWKM sign catalog, the LMGG concordance table,
                Kerr vase photography, Harvard CMHI drawings, Peabody site coordinates, a machine
                learning glyph dataset, and a unified cross-catalog concordance linking signs across
                13 numbering systems.
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
              <td className="px-3 py-1 text-xs">Data current through early 2022 — recent discoveries or reclassifications may not be reflected.</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">{s ? `${linkedPct} of individual glyphs are identified and linked to a catalog sign. The remaining ${unlinkedPct} are either eroded/unreadable (code "000"), uncertain readings (?), or bare numerals.` : <Loading />}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">737 of 1,075 Bonn/TWKM signs matched to MHD catalog entries{s ? ` (${pct(s.bonnImageCoverage, s.totalSigns)} of ${fmt(s.totalSigns)} entries)` : ''}. The 338 unmatched signs are mostly from the 1500+ series — newer additions to the Bonn catalog that don't have MHD equivalents.</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs">GPS coordinates available for 200+ sites across 5 regions (Petén, Usumacinta, Southeast, Northern Yucatan, Western).</td>
            </tr>
          </tbody>
        </table>

        {/* Database Overview — at bottom */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase" colSpan={2}>Database</th>
              <th className="px-3 py-1 text-right text-xs">
                {s ? `${fmt(s.totalSigns + s.totalBlocks + s.totalGraphemes + s.totalRoboflow + s.totalKerr + totalCmhi)} total records` : <Loading />}
              </th>
            </tr>
          </thead>
          <tbody>
            {s ? (
              <>
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
                  <td className="px-3 py-1 text-sm">individual glyphs</td>
                  <td className="px-3 py-1 text-xs">{fmt(s.graphemesLinkedToCatalog)} identified and linked to catalog</td>
                </tr>
                <tr>
                  <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalRoboflow)}</td>
                  <td className="px-3 py-1 text-sm">ML annotations</td>
                  <td className="px-3 py-1 text-xs">machine-learning detected glyph instances</td>
                </tr>
                <tr>
                  <td className="px-3 py-1 text-sm font-[800]">{fmt(s.totalKerr)}</td>
                  <td className="px-3 py-1 text-sm">Kerr vessels</td>
                  <td className="px-3 py-1 text-xs">rollout photographs of painted ceramics</td>
                </tr>
                <tr>
                  <td className="px-3 py-1 text-sm font-[800]">{fmt(totalCmhi)}</td>
                  <td className="px-3 py-1 text-sm">CMHI images</td>
                  <td className="px-3 py-1 text-xs">{fmt(s.totalCmhiDrawings)} line drawings, {fmt(s.totalCmhiPhotos)} photographs</td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="px-3 py-1 text-xs" colSpan={3}><Loading /></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Top Sites — at bottom */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase" colSpan={4}>Top Archaeological Sites</th>
            </tr>
            <tr>
              <th className="px-3 py-1 text-left text-xs">#</th>
              <th className="px-3 py-1 text-left text-xs">Site</th>
              <th className="px-3 py-1 text-right text-xs">Glyphs</th>
              <th className="px-3 py-1 text-right text-xs">Share</th>
            </tr>
          </thead>
          <tbody>
            {s ? s.topSites.map((site, idx) => (
              <tr key={site.site}>
                <td className="px-3 py-1 text-sm">{idx + 1}</td>
                <td className="px-3 py-1 text-sm font-[800]">{site.site}</td>
                <td className="px-3 py-1 text-sm text-right">{site.count.toLocaleString()}</td>
                <td className="px-3 py-1 text-xs text-right">{((site.count / s.totalGraphemes) * 100).toFixed(1)}%</td>
              </tr>
            )) : (
              <tr>
                <td className="px-3 py-1 text-xs" colSpan={4}><Loading /></td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="text-xs italic text-center px-3 py-2">
          This project consolidates publicly available scholarly resources.
          All contributors will be credited as co-authors in resulting publications.
        </p>

      </div>
    </div>
  );
}
