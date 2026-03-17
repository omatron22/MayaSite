import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

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

export const BlockCard = memo(({ block }: BlockCardProps) => {
  const navigate = useNavigate();
  return (
    <tr className="cursor-pointer" onClick={() => navigate(`/block/${block.id}`)}>
      <td className="px-2 py-1">
        {block.block_img ? (
          <div className="flex items-center justify-center w-8 h-8">
            <img src={block.block_img} alt={block.block_id} loading="lazy" width={32} height={32} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        ) : (
          <span className="text-xs">--</span>
        )}
      </td>
      <td className="px-2 py-1 font-[800]">{block.block_id}</td>
      <td className="px-2 py-1 text-xs">{block.artifact_code || '--'}</td>
      <td className="px-2 py-1 text-xs">{block.site_name || '--'}</td>
      <td className="px-2 py-1 text-xs">{block.block_maya1 || '--'}</td>
      <td className="px-2 py-1 text-xs italic max-w-[180px] truncate">{block.block_english ? `"${block.block_english}"` : '--'}</td>
      <td className="px-2 py-1 text-xs">{block.event_calendar || '--'}</td>
    </tr>
  );
});

BlockCard.displayName = 'BlockCard';
