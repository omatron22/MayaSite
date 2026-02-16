import { memo } from 'react';
import { Link } from 'react-router-dom';

interface GraphemeCardProps {
  grapheme: {
    id: number;
    mhd_code_sub?: string | null;
    grapheme_code: string;
    syllabic_value?: string | null;
    block_maya1?: string | null;
    block_english?: string | null;
    artifact_code?: string | null;
    site_name?: string | null;
    event_calendar?: string | null;
    block_img?: string | null;
  };
}

export const GraphemeCard = memo(({ grapheme }: GraphemeCardProps) => (
  <Link
    to={`/grapheme/${grapheme.id}`}
    className="border border-gray-200 rounded-lg p-3 flex gap-4 hover:bg-gray-50 no-underline max-md:flex-col"
  >
    {grapheme.block_img && (
      <div className="shrink-0 w-16 h-16 bg-gray-50 rounded border border-gray-200 overflow-hidden flex items-center justify-center p-1">
        <img src={grapheme.block_img} alt="Block" loading="lazy" className="w-full h-full object-contain pointer-events-none" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        <span className="font-semibold text-gray-900 text-sm">{grapheme.mhd_code_sub || grapheme.grapheme_code}</span>
        {grapheme.syllabic_value && <span className="text-blue-600 italic text-xs">{grapheme.syllabic_value}</span>}
      </div>
      {grapheme.block_maya1 && <div className="text-sm mb-1 text-gray-800 leading-normal">{grapheme.block_maya1}</div>}
      {grapheme.block_english && <div className="text-xs italic text-gray-500 mb-2 leading-normal">&quot;{grapheme.block_english}&quot;</div>}
      <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
        {grapheme.artifact_code && <span>{grapheme.artifact_code}</span>}
        {grapheme.site_name && <span>{grapheme.site_name}</span>}
        {grapheme.event_calendar && <span>{grapheme.event_calendar}</span>}
      </div>
    </div>
  </Link>
));

GraphemeCard.displayName = 'GraphemeCard';
