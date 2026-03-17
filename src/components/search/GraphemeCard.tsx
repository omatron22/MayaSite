import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

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

export const GraphemeCard = memo(({ grapheme }: GraphemeCardProps) => {
  const navigate = useNavigate();
  return (
    <tr className="cursor-pointer" onClick={() => navigate(`/grapheme/${grapheme.id}`)}>
      <td className="px-2 py-1">
        {grapheme.block_img ? (
          <div className="flex items-center justify-center w-8 h-8">
            <img src={grapheme.block_img} alt={grapheme.grapheme_code} loading="lazy" width={32} height={32} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        ) : (
          <span className="text-xs">--</span>
        )}
      </td>
      <td className="px-2 py-1 font-[800]">{grapheme.mhd_code_sub || grapheme.grapheme_code}</td>
      <td className="px-2 py-1 text-xs italic">{grapheme.syllabic_value || '--'}</td>
      <td className="px-2 py-1 text-xs">{grapheme.artifact_code || '--'}</td>
      <td className="px-2 py-1 text-xs">{grapheme.site_name || '--'}</td>
      <td className="px-2 py-1 text-xs max-w-[180px] truncate">{grapheme.block_maya1 || '--'}</td>
      <td className="px-2 py-1 text-xs">{grapheme.event_calendar || '--'}</td>
    </tr>
  );
});

GraphemeCard.displayName = 'GraphemeCard';
