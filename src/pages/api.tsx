import { Link } from 'react-router-dom';

const BASE = 'https://mayasite.vercel.app';

type Endpoint = {
  method: string;
  path: string;
  description: string;
  params?: { name: string; note: string }[];
  example: string;
};

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/search',
    description: 'Multi-mode search across signs, blocks, graphemes, and concordance entries.',
    params: [
      { name: 'mode', note: 'signs | blocks | graphemes | concordance (default: signs)' },
      { name: 'q', note: 'Search query' },
      { name: 'page', note: 'Page number (default: 1)' },
      { name: 'pageSize', note: 'Results per page, max 100 (default: 48)' },
      { name: 'export', note: '"true" for full export up to 5,000 results' },
      { name: 'sortBy', note: 'code | frequency | completeness (signs); catalog_code | catalog | reading_value (concordance)' },
      { name: 'catalog', note: 'Filter concordance by catalog: MHD, TWKM, Thompson, etc.' },
    ],
    example: '/api/search?mode=signs&q=jaguar',
  },
  {
    method: 'GET',
    path: '/api/signs/:id',
    description: 'Full sign detail with grapheme instances, ML annotations, cross-references, and visual variants.',
    params: [
      { name: 'id', note: 'Integer sign ID from catalog_signs' },
    ],
    example: '/api/signs/1',
  },
  {
    method: 'GET',
    path: '/api/signs/lookup',
    description: 'Batch lookup signs by code. Returns image URLs and IDs.',
    params: [
      { name: 'codes', note: 'Comma-separated sign codes, max 100' },
    ],
    example: '/api/signs/lookup?codes=1B7,1G1,ZQH',
  },
  {
    method: 'GET',
    path: '/api/blocks/:id',
    description: 'Block detail with graphemes, parsed sign sequence, and navigation.',
    params: [
      { name: 'id', note: 'Integer block ID' },
    ],
    example: '/api/blocks/1',
  },
  {
    method: 'GET',
    path: '/api/graphemes/:id',
    description: 'Grapheme detail with linked block and catalog data.',
    params: [
      { name: 'id', note: 'Integer grapheme ID' },
    ],
    example: '/api/graphemes/1',
  },
  {
    method: 'GET',
    path: '/api/meta',
    description: 'Database statistics or site list with coordinates.',
    params: [
      { name: 'type', note: 'stats | sites (required)' },
    ],
    example: '/api/meta?type=stats',
  },
  {
    method: 'GET',
    path: '/api/collections',
    description: 'Kerr Maya Vase photographs or Harvard CMHI drawings/photos.',
    params: [
      { name: 'source', note: 'kerr | cmhi (required)' },
      { name: 'q', note: 'Search query (Kerr)' },
      { name: 'site', note: 'Site filter (CMHI)' },
      { name: 'type', note: 'drawing | photo (CMHI)' },
    ],
    example: '/api/collections?source=kerr&q=K1398',
  },
  {
    method: 'POST',
    path: '/api/inference',
    description: 'Run ML glyph detection on an image via Roboflow.',
    params: [
      { name: 'body', note: '{ "image": "base64_encoded_image" }' },
    ],
    example: '/api/inference',
  },
  {
    method: 'GET',
    path: '/api/analytics',
    description: 'Usage analytics.',
    example: '/api/analytics',
  },
];

export function ApiPage() {
  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <table className="w-auto">
          <thead>
            <tr>
              <th className="px-3 py-1 text-left text-xs">
                <Link to="/search" className="underline hover:no-underline font-normal">Search</Link>
                {' > '}
                <span className="font-[800]">API</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-3 text-xs">
                All endpoints return JSON and require no authentication. Base URL:
                <br />
                <code className="font-[800] select-all">{BASE}/api</code>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Endpoints */}
        {endpoints.map((ep) => (
          <table key={ep.path} className="w-auto">
            <thead>
              <tr>
                <th colSpan={2} className="px-3 py-1 text-left text-xs">
                  <span className="font-[800]">{ep.method}</span>{' '}
                  <code>{ep.path}</code>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-3 py-1 text-xs">{ep.description}</td>
              </tr>
              {ep.params && ep.params.map((p) => (
                <tr key={p.name}>
                  <td className="px-3 py-1 text-xs font-[800] whitespace-nowrap align-top">{p.name}</td>
                  <td className="px-3 py-1 text-xs">{p.note}</td>
                </tr>
              ))}
              <tr>
                <td className="px-3 py-1 text-xs font-[800] align-top">Try</td>
                <td className="px-3 py-1 text-xs">
                  <a
                    href={`${BASE}${ep.example}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline break-all"
                  >
                    {ep.example}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        ))}

        {/* Data summary */}
        <table className="w-auto">
          <thead>
            <tr>
              <th colSpan={2} className="px-3 py-1 text-left text-xs uppercase">Current Data</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="px-3 py-1 text-xs font-[800]">Catalog signs</td><td className="px-3 py-1 text-xs">3,141</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">Blocks</td><td className="px-3 py-1 text-xs">208,001</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">Graphemes</td><td className="px-3 py-1 text-xs">208,000</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">Concordance entries</td><td className="px-3 py-1 text-xs">11,250</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">Cross-catalog links</td><td className="px-3 py-1 text-xs">7,699</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">ML annotations</td><td className="px-3 py-1 text-xs">10,665</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">Kerr vessels</td><td className="px-3 py-1 text-xs">1,879</td></tr>
            <tr><td className="px-3 py-1 text-xs font-[800]">CMHI images</td><td className="px-3 py-1 text-xs">1,042</td></tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}
