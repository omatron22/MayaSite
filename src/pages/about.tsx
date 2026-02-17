import { ExternalLink } from 'lucide-react';

const DATA_SOURCES = [
  { title: 'Maya Hieroglyphic Database (MHD)', desc: '2,765 catalog signs, 85,600 glyph blocks, and 208,000 grapheme instances with images, dates, and translations', url: 'https://mayadatabase.org' },
  { title: 'LMGG Concordance Table', desc: '1,236 cross-referenced MHD codes with TWKM (Bonn), Thompson, and CMGG mappings scraped from all three concordance pages', url: 'https://mayaglyphs.org/LMGGC.html' },
  { title: 'Roboflow ML Dataset', desc: '5,887 annotated glyph instances across 389 categories for computer vision training', url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k' },
  { title: 'Cross-Reference Codes (via MHD + LMGG)', desc: 'Thompson (85%), Zender/Bonn (51%), Kettunen (35%), and Gronemeyer (29%) codes from MHD catalog entries enriched with LMGG concordance data', url: null },
];

const RESEARCH_RESOURCES = [
  { title: 'Introduction to Maya Hieroglyphs', desc: 'Comprehensive introduction for students and researchers', url: 'https://www.mesoweb.com/resources/handbook/IMH2020.pdf' },
  { title: 'Visual Catalog of Maya Hieroglyphs', desc: 'Tokovinine\'s illustrated reference catalog', url: 'https://www.mesoweb.com/resources/catalog/Tokovinine_Catalog.pdf' },
  { title: 'ClassicMayan Sign Catalog', desc: 'Interactive online sign catalog with phonetic values (Bonn/TWKM)', url: 'https://classicmayan.org' },
  { title: 'Updated Maya-English Vocabulary', desc: 'Comprehensive vocabulary list for decipherment', url: 'https://www.mesoweb.com/resources/vocabulary/Vocabulary-2009.01.pdf' },
];

export function AboutPage() {
  return (
    <div className="bg-white p-6 md:p-8">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-2">About</h1>
        <p className="text-gray-500 text-sm mb-8">
          Unifying Maya hieroglyphic research through accessible, consolidated data
        </p>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">The Challenge</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Maya glyphs have been catalogued according to multiple, often incompatible classification
              systems over the past century. This fragmentation forces researchers to cross-reference
              multiple sources manually, slowing progress and creating barriers to entry.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Our Solution</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              We've unified data from the Maya Hieroglyphic Database (MHD), the LMGG concordance tables,
              and machine learning datasets into a single searchable interface.
            </p>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              {[
                { num: '2,765', label: 'Catalog signs from MHD' },
                { num: '85,600', label: 'Glyph blocks from inscriptions' },
                { num: '208K', label: 'Grapheme instances in context' },
                { num: '5,887', label: 'ML annotated examples' },
              ].map((f) => (
                <div key={f.num + f.label} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{f.num}</div>
                  <div className="text-xs text-gray-500 leading-snug">{f.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Cross-Catalog Integration</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              We integrate multiple classification systems to help researchers navigate between catalogs.
              Coverage varies by system (percentages indicate how many of 2,765 catalog signs have a code):
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Thompson (85%)',
                'Kettunen (35%)',
                'Gronemeyer (29%)',
                'Zender / Bonn (51%)',
                'MHD 2003',
                'TWKM (via LMGG)',
                'CMGG (via LMGG)',
              ].map((tag) => (
                <span key={tag} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Data Sources</h2>
            <div className="flex flex-col gap-3">
              {DATA_SOURCES.map((s) => (
                <div key={s.title}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-900 text-sm">{s.title}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Research Resources</h2>
            <div className="flex flex-col gap-3">
              {RESEARCH_RESOURCES.map((r) => (
                <div key={r.title}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-900 text-sm">{r.title}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="text-gray-500 text-xs leading-relaxed">{r.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Known Limitations</h2>
            <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1">
              <li>Site/region mapping covers 93% of blocks across ~80 archaeological sites. The remaining 7% are smaller or less well-documented sites.</li>
              <li>MHD data was scraped in early 2022 and may be missing records added since then.</li>
              <li>ClassicMayan.org (Bonn), Kerr Database, and Harvard CMHI are not yet directly integrated as primary sources.</li>
            </ul>
          </section>

          <p className="text-gray-400 text-xs italic text-center pt-4 border-t border-gray-100">
            This project consolidates publicly available scholarly resources.
            All contributors to this database will be credited as co-authors in resulting publications.
          </p>
        </div>
      </div>
    </div>
  );
}
