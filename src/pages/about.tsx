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

  type Source = {
    title: string;
    desc: string | React.ReactNode;
    license: string;
    attribution: string;
    images: 'linked' | 'hosted' | 'none';
    url: string | null;
  };
  const dataSources: Source[] = [
    {
      title: 'Maya Hieroglyphic Database (MHD)',
      desc: s ? `${fmt(s.totalSigns)} signs, ${fmt(s.totalBlocks)} inscription blocks, and ${fmt(s.totalGraphemes)} individual glyph occurrences from the largest Maya epigraphy database.` : <Loading />,
      license: 'No open reuse license. Scholarly use only. Cite: tDAR id 514652, doi:10.48512/XCV8514652.',
      attribution: 'Drawings by Matthew Looper, with codical examples by Martha Macri.',
      images: 'linked',
      url: 'https://mayadatabase.org',
    },
    {
      title: 'ClassicMayan / Bonn / TWKM Sign Catalog',
      desc: '1,075 signs with 1,565 visual variants and 1,216 proposed readings (with confidence + criteria) from the University of Bonn TWKM project. Includes 517 catalogued artefacts and 37 places linked to graph occurrences.',
      license: 'Creative Commons Attribution 4.0 International (CC BY 4.0). https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Drawings by Christian Prager / TWKM, Rheinische Friedrich-Wilhelms-Universität Bonn.',
      images: 'linked',
      url: 'https://classicmayan.org',
    },
    {
      title: 'Learner’s Maya Glyph Guide (LMGG)',
      desc: '1,236 signs cross-referenced between Thompson, TWKM, and CMGG numbering systems.',
      license: 'No open license found. Treated as scholarly / noncommercial attribution-only reference data.',
      attribution: 'Sim Lee (guide); John Pedersen (website and concordance work). mayaglyphs.org',
      images: 'none',
      url: 'https://mayaglyphs.org/LMGGC.html',
    },
    {
      title: 'Kerr Maya Vase Database',
      desc: s ? `${fmt(s.totalKerr)} rollout photographs of painted Maya ceramic vessels.` : <Loading />,
      license: 'Copyright / permission-required. Use inquiries: mayavase@aol.com.',
      attribution: 'Photographs © Justin Kerr; courtesy of the Kerr family and FAMSI Kerr Collections.',
      images: 'linked',
      url: 'https://research.mayavase.com/kerrmaya.html',
    },
    {
      title: 'Harvard CMHI',
      desc: s ? `${fmt(totalCmhi)} images from the Corpus of Maya Hieroglyphic Inscriptions — ${fmt(s.totalCmhiDrawings)} line drawings and ${fmt(s.totalCmhiPhotos)} photographs.` : <Loading />,
      license: 'Copyright / permission-required. Personal scholarly research/study use only unless permission is granted.',
      attribution: 'Peabody Museum of Archaeology & Ethnology, Harvard University.',
      images: 'linked',
      url: 'https://peabody.harvard.edu/cmhi',
    },
    {
      title: 'Roboflow Maya glyph dataset',
      desc: s ? `${fmt(s.totalRoboflow)} machine-learning-annotated glyph images for automated sign recognition.` : <Loading />,
      license: 'CC BY-NC-SA 4.0. https://creativecommons.org/licenses/by-nc-sa/4.0/',
      attribution: '“yax” Dataset by utz’ib, Roboflow Universe (maya-glyphs/yax project).',
      images: 'hosted',
      url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k',
    },
    {
      title: 'Site coordinates',
      desc: '200+ archaeological site abbreviations mapped to GPS coordinates across 5 Maya regions.',
      license: 'MayaSite project data. Not copied from Peabody CMHI site-code pages.',
      attribution: 'Hand-compiled from academic and archaeological references (src/lib/sites.ts).',
      images: 'none',
      url: null,
    },
    {
      title: 'Cross-Catalog Concordance (derived)',
      desc: s ? `${fmt(s.totalSigns)} entries linked across 13 catalog systems (MHD, TWKM, Thompson, CMGG, Grube, and 8 others) — ${pct(s.thompsonCoverage, s.totalSigns)} Thompson coverage, ${pct(s.zenderCoverage, s.totalSigns)} Zender coverage. Derived from MHD + TWKM + LMGG imports; not an independent source.` : <Loading />,
      license: 'MayaSite-derived data. Each link inherits the terms of its source.',
      attribution: 'See contributing sources above.',
      images: 'none',
      url: null,
    },
    {
      title: 'Sign Readings — polysemy (derived)',
      desc: '2,901 readings recorded across 13 catalog systems: 575 signs now have more than one attested reading (polysemy realized). Backfilled from MHD syllabic/logographic values + every TWKM decipherment with its confidence level and supporting criteria.',
      license: 'MayaSite-derived data. Each row inherits the terms of its source.',
      attribution: 'See MHD and TWKM rows above.',
      images: 'none',
      url: null,
    },
    {
      title: 'Entity layer — rulers, places, scribes (derived + curated)',
      desc: '274 entities with 108 aliases and 228,547 block mentions. Includes 28 curated famous rulers (K\'inich Janaab\' Pakal I, Bird Jaguar IV, etc.) with English + Mayan alias variants, 222 places auto-seeded from block site_name, and 24 scribes from block.scribe.',
      license: 'MayaSite-derived. Curated ruler list compiled from standard reference works (Martin & Grube, "Chronicle of the Maya Kings and Queens").',
      attribution: 'See contributing sources above.',
      images: 'none',
      url: null,
    },
    {
      title: 'Wayeb European Association of Mayanists',
      desc: 'External reference: the Wayeb online publications (incl. the introductory handbook by Kettunen & Helmke) are the de facto English-language guide to reading Maya hieroglyphs. We link out — not redistribute.',
      license: 'Free download from publisher. Cite the handbook directly.',
      attribution: 'Harri Kettunen & Christophe Helmke, "Introduction to Maya Hieroglyphs" (latest edition).',
      images: 'none',
      url: 'https://www.wayeb.org/resources/',
    },
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
                This project brings together 7 scholarly data sources into one searchable
                interface — MHD, the Bonn/TWKM sign catalog (signs, artefacts, places), LMGG, Kerr
                vase photography, Harvard CMHI, a Roboflow ML glyph dataset, and hand-compiled site
                coordinates — plus three derived layers: a concordance linking signs across 13
                numbering systems, a polysemy table of 2,901 readings (575 signs with multiple
                attested readings), and an entity layer of 274 rulers/places/scribes wired into
                228k block mentions.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Data Sources */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Source</th>
              <th className="px-3 py-1 text-left text-xs uppercase">Description, attribution, license</th>
              <th className="px-3 py-1 text-left text-xs uppercase">Images</th>
              <th className="px-3 py-1 text-left text-xs uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((ds) => (
              <tr key={ds.title} className="align-top">
                <td className="px-3 py-2 text-sm font-[800] whitespace-nowrap">{ds.title}</td>
                <td className="px-3 py-2 text-xs space-y-1">
                  <div>{ds.desc}</div>
                  <div><span className="font-[800]">Credit:</span> {ds.attribution}</div>
                  <div><span className="font-[800]">License:</span> {ds.license}</div>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {ds.images === 'linked' && 'linked from source'}
                  {ds.images === 'hosted' && 'hosted by MayaSite'}
                  {ds.images === 'none' && '—'}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
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

        {/* Corrections / takedown */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs uppercase">Corrections &amp; rights inquiries</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-xs">
                MayaSite is a noncommercial scholarly reference tool. It links to images from the
                source servers above (Kerr, Harvard CMHI, MHD, ClassicMayan) rather than re-hosting
                them. Roboflow training data is the one exception and is hosted under its
                CC BY-NC-SA license.
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-xs">
                If you are a rights holder and believe any image, metadata, or attribution should
                be corrected, restricted, or removed, please email{' '}
                <a href="mailto:omaresp35@gmail.com" className="underline hover:no-underline">
                  omaresp35@gmail.com
                </a>{' '}
                with the source URL and the affected MayaSite page. Requests are reviewed
                promptly.
              </td>
            </tr>
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
              <td className="px-3 py-1 text-xs">Source vintage varies per data source — see the Source table above. Some sources (LMGG, ClassicMayan, Roboflow) are updated upstream more frequently than the MayaSite import cycle.</td>
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
