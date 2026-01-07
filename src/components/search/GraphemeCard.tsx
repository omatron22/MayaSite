// src/components/search/GraphemeCard.tsx - FIXED!

import { memo, useCallback } from 'react';

interface GraphemeCardProps {
  grapheme: {
    id: number;
    mhd_code_sub?: string;
    grapheme_code: string;
    syllabic_value?: string;
    block_maya1?: string;
    block_english?: string;
    artifact_code?: string;
    site_name?: string;
    event_calendar?: string;
    block_img?: string;
  };
  index: number;
  onClick: (id: number, index: number) => void;
}

export const GraphemeCard = memo(({ grapheme, index, onClick }: GraphemeCardProps) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🟣 CARD CLICKED:', grapheme.id, index);
    onClick(grapheme.id, index);
  }, [grapheme.id, index, onClick]);

  return (
    <div className="grapheme-card clickable" onClick={handleClick}>
      {grapheme.block_img && (
        <div className="grapheme-image">
          <img src={grapheme.block_img} alt="Block" loading="lazy" />
        </div>
      )}
      <div className="grapheme-content">
        <div className="grapheme-header">
          <span className="grapheme-sign">{grapheme.mhd_code_sub || grapheme.grapheme_code}</span>
          {grapheme.syllabic_value && <span className="grapheme-phonetic">{grapheme.syllabic_value}</span>}
        </div>
        {grapheme.block_maya1 && <div className="grapheme-maya">{grapheme.block_maya1}</div>}
        {grapheme.block_english && <div className="grapheme-english">"{grapheme.block_english}"</div>}
        <div className="grapheme-meta">
          {grapheme.artifact_code && <span>{grapheme.artifact_code}</span>}
          {grapheme.site_name && <span>{grapheme.site_name}</span>}
          {grapheme.event_calendar && <span>{grapheme.event_calendar}</span>}
        </div>
      </div>
    </div>
  );
});

GraphemeCard.displayName = 'GraphemeCard';
