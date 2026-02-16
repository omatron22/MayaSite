import { ExternalLink } from 'lucide-react';

const DATA_SOURCES = [
  { title: 'Maya Hieroglyphic Database (MHD)', desc: 'Comprehensive scholarly database with artifact locations, dates, and contextual metadata', url: 'https://mayadatabase.org' },
  { title: 'ClassicMayan.org / Bonn Catalog', desc: 'Sign catalog with Zender codes and phonetic values from the University of Bonn', url: 'https://classicmayan.org' },
  { title: 'Kerr Database', desc: '~1,400 vessel photos with rollout photography of painted ceramics', url: 'http://research.mayavase.com' },
  { title: 'Harvard Peabody / CMHI', desc: 'Line drawings of inscriptions organized by archaeological site', url: 'https://peabody.harvard.edu' },
  { title: 'LMGG Concordance Table', desc: 'Cross-reference between major glyph classification systems', url: 'https://mayaglyphs.org/LMGGC.html' },
  { title: 'Roboflow ML Dataset', desc: '10,665 annotated glyph instances for computer vision training and inference', url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k' },
  { title: 'Cross-Reference Tables', desc: 'Manually curated mappings between Thompson, Zender, Kettunen, and Gronemeyer systems', url: null },
];

const RESEARCH_RESOURCES = [
  { title: 'Introduction to Maya Hieroglyphs', desc: 'Comprehensive introduction for students and researchers', url: 'https://www.mesoweb.com/resources/handbook/IMH2020.pdf' },
  { title: 'Visual Catalog of Maya Hieroglyphs', desc: 'Tokovinine\'s illustrated reference catalog', url: 'https://www.mesoweb.com/resources/catalog/Tokovinine_Catalog.pdf' },
  { title: 'ClassicMayan Sign Catalog', desc: 'Interactive online sign catalog with phonetic values', url: 'https://classicmayan.org' },
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
              We've unified data from the Maya Hieroglyphic Database (MHD), machine learning datasets,
              and cross-catalog mappings into a single searchable interface.
            </p>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              {[
                { num: '3,141', label: 'Catalog signs with images and translations' },
                { num: '208K', label: 'Glyph blocks from real inscriptions' },
                { num: '208K', label: 'Grapheme instances in context' },
                { num: '10,665', label: 'ML annotated examples' },
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
              We integrate multiple classification systems to help researchers navigate between catalogs:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Thompson (1962)', 'Zender', 'Kettunen (2011)', 'Gronemeyer', 'MHD 2003'].map((tag) => (
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

          <p className="text-gray-400 text-xs italic text-center pt-4 border-t border-gray-100">
            This project consolidates publicly available scholarly resources.
            All contributors to this database will be credited as co-authors in resulting publications.
          </p>
        </div>
      </div>
    </div>
  );
}
