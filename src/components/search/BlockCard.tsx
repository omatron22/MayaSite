import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

interface BlockCardProps {
  block: {
    id: number;
    block_id: string;
    artifact_code?: string;
    site_name?: string | null;
    block_maya1?: string | null;
    block_english?: string | null;
    event_calendar?: string | null;
    block_img?: string | null;
  };
}

export const BlockCard = memo(({ block }: BlockCardProps) => (
  <Link
    to={`/block/${block.id}`}
    className="border border-gray-200 rounded-lg p-3 flex gap-4 hover:bg-gray-50 no-underline max-md:flex-col"
  >
    {block.block_img && (
      <div className="shrink-0 w-20 h-20 max-md:w-full max-md:h-32 bg-gray-50 rounded border border-gray-200 overflow-hidden flex items-center justify-center p-1">
        <img src={block.block_img} alt={block.block_id} loading="lazy" className="w-full h-full object-contain pointer-events-none" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        <span className="font-semibold text-gray-900 text-sm">{block.block_id}</span>
        {block.artifact_code && (
          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{block.artifact_code}</span>
        )}
        {block.site_name && (
          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{block.site_name}</span>
        )}
        {block.event_calendar && (
          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
            <Calendar size={10} />
            {block.event_calendar}
          </span>
        )}
      </div>
      {block.block_maya1 && <div className="text-sm mb-1 text-gray-800 leading-normal">{block.block_maya1}</div>}
      {block.block_english && <div className="text-xs italic text-gray-500 leading-normal">&quot;{block.block_english}&quot;</div>}
    </div>
  </Link>
));

BlockCard.displayName = 'BlockCard';
