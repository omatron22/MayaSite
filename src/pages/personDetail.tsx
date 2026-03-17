import { useState, useEffect } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <ProgressBarLoader />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white p-6">
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error || 'Person not found'}</p>
          <Link to="/search" className="text-black underline hover:underline">Back to search</Link>
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
          <Link to="/search" className="text-sm text-black  mb-2 inline-block">
            &larr; Back to search
          </Link>
          <h1 className="text-3xl font-[800] uppercase text-black">{person.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5  text-xs font-[600] bg-white text-black border-2 border-black">
              {sourceLabel}
            </span>
            {person.site_name && (
              <span className="text-black text-sm">{person.site_name}</span>
            )}
            <span className="text-black text-sm">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          </div>
          {person.notes && (
            <p className="text-black mt-3 text-sm">{person.notes}</p>
          )}
        </div>

        {/* Site distribution */}
        {sites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-[800] uppercase text-black mb-3">Sites</h2>
            <div className="flex flex-wrap gap-2">
              {sites.map(s => (
                <span key={s.site_name} className="inline-flex items-center gap-1.5 px-3 py-1  bg-white text-sm text-black">
                  {s.site_name}
                  <span className="text-black">({s.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blocks */}
        <div>
          <h2 className="text-lg font-[800] uppercase text-black mb-3">
            Associated Blocks
            {!isNamedPerson && (
              <span className="text-sm font-normal text-black ml-2">
                Blocks referencing person code {person.name}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks.map(block => (
              <Link
                key={block.id}
                to={`/block/${block.id}`}
                className="border  p-4 hover:bg-white transition-all border-black"
              >
                {block.block_img && (
                  <div className="mb-3 bg-white  overflow-hidden" style={{ height: 120 }}>
                    <img
                      src={block.block_img}
                      alt={block.mhd_block_id}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="text-sm font-[600] text-black">{block.mhd_block_id}</div>
                {block.site_name && (
                  <div className="text-xs text-black">{block.site_name}</div>
                )}
                {block.block_english && (
                  <div className="text-xs text-black mt-1 line-clamp-2">{block.block_english}</div>
                )}
                {block.event_calendar && (
                  <div className="text-xs text-black mt-1">{block.event_calendar}</div>
                )}
                <div className="mt-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5  text-xs font-[600] ${
                    block.role === 'ruler' ? 'bg-white text-black border-2 border-black'
                    : block.role === 'scribe' ? 'bg-white text-black border-2 border-black'
                    : 'bg-white text-black border-2 border-black'
                  }`}>
                    {block.role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {blocks.length >= 200 && (
            <p className="text-sm text-black mt-4 text-center">
              Showing first 200 blocks. This person appears in more blocks.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
