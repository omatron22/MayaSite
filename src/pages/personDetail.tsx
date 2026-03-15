import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPerson, type PersonDetailResponse } from '../lib/api';

export function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>();
  const [data, setData] = useState<PersonDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPerson(personId, controller.signal)
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [personId]);

  if (loading) {
    return (
      <div className="bg-white p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-500">Loading person...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white p-6">
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error || 'Person not found'}</p>
          <Link to="/search" className="text-blue-600 hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const { person, blocks, sites } = data;

  const sourceLabel = person.source === 'classicmayan.org' ? 'ClassicMayan.org'
    : person.source === 'MHD' ? 'Maya Hieroglyphic Database'
    : person.source;

  const isNamedPerson = person.source === 'classicmayan.org';

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/search" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to search
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{person.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {sourceLabel}
            </span>
            {person.site_name && (
              <span className="text-gray-500 text-sm">{person.site_name}</span>
            )}
            <span className="text-gray-400 text-sm">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          </div>
          {person.notes && (
            <p className="text-gray-600 mt-3 text-sm">{person.notes}</p>
          )}
        </div>

        {/* Site distribution */}
        {sites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Sites</h2>
            <div className="flex flex-wrap gap-2">
              {sites.map(s => (
                <span key={s.site_name} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                  {s.site_name}
                  <span className="text-gray-400">({s.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blocks */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Associated Blocks
            {!isNamedPerson && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                Blocks referencing person code {person.name}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks.map(block => (
              <Link
                key={block.id}
                to={`/block/${block.id}`}
                className="border rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                {block.block_img && (
                  <div className="mb-3 bg-gray-50 rounded overflow-hidden" style={{ height: 120 }}>
                    <img
                      src={block.block_img}
                      alt={block.mhd_block_id}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="text-sm font-medium text-gray-900">{block.mhd_block_id}</div>
                {block.site_name && (
                  <div className="text-xs text-gray-500">{block.site_name}</div>
                )}
                {block.block_english && (
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{block.block_english}</div>
                )}
                {block.event_calendar && (
                  <div className="text-xs text-gray-400 mt-1">{block.event_calendar}</div>
                )}
                <div className="mt-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    block.role === 'ruler' ? 'bg-amber-100 text-amber-800'
                    : block.role === 'scribe' ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                  }`}>
                    {block.role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {blocks.length >= 200 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing first 200 blocks. This person appears in more blocks.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
