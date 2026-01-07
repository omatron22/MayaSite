// src/components/search/BlockCard.tsx
import { memo, useCallback } from 'react';
import { CalendarIcon } from './icons';

interface BlockCardProps {
  block: {
    id: number;
    block_id: string;
    artifact_code?: string;
    site_name?: string;
    block_maya1?: string;
    block_english?: string;
    event_calendar?: string;
    block_img?: string;
  };
  index: number;
  onClick: (id: number, index: number) => void;
}

// src/components/search/BlockCard.tsx - FIX THE EVENT HANDLER

export const BlockCard = memo(({ block, index, onClick }: BlockCardProps) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // IMPORTANT: Stop event from bubbling
    onClick(block.id, index);
  }, [block.id, index, onClick]);
  
  return (
    <div className="block-card clickable" onClick={handleClick}>
      {block.block_img && (
        <div className="block-image">
          <img src={block.block_img} alt={block.block_id} loading="lazy" />
        </div>
      )}
      <div className="block-content">
        <div className="block-header">
          <span className="block-id">{block.block_id}</span>
          {block.artifact_code && <span className="block-site">{block.artifact_code}</span>}
          {block.site_name && <span className="block-region">{block.site_name}</span>}
          {block.event_calendar && (
            <span className="block-date">
              <CalendarIcon />
              {block.event_calendar}
            </span>
          )}
        </div>
        {block.block_maya1 && <div className="block-maya">{block.block_maya1}</div>}
        {block.block_english && <div className="block-english">"{block.block_english}"</div>}
      </div>
    </div>
  );
});

BlockCard.displayName = 'BlockCard';

