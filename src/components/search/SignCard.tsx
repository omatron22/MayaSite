// src/components/search/SignCard.tsx
import { memo } from 'react';
import { Link } from 'react-router-dom';

interface SignCardProps {
  sign: {
    id: number;
    display_code: string;
    primary_image_url?: string;
    thompson_code?: string;
    syllabic_value?: string;
    english_translation?: string;
    word_class?: string;
    grapheme_count: number;
    roboflow_count: number;
  };
}

export const SignCard = memo(({ sign }: SignCardProps) => (
  <Link to={`/sign/${sign.id}`} className="sign-card">
    <div className="sign-image">
      {sign.primary_image_url ? (
        <img src={sign.primary_image_url} alt={sign.display_code} loading="lazy" />
      ) : (
        <div className="no-image">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      )}
    </div>
    <div className="sign-info">
      <div className="sign-code">{sign.display_code}</div>
      {sign.thompson_code && <div className="thompson-code">T{sign.thompson_code}</div>}
      {sign.syllabic_value && <div className="phonetic">{sign.syllabic_value}</div>}
      {sign.english_translation && <div className="translation">"{sign.english_translation}"</div>}
      {sign.word_class && <div className="word-class">{sign.word_class}</div>}
      <div className="sign-counts">
        {sign.grapheme_count > 0 && <span className="count-badge uses">{sign.grapheme_count} uses</span>}
        {sign.roboflow_count > 0 && <span className="count-badge examples">{sign.roboflow_count} ML</span>}
      </div>
    </div>
  </Link>
));

SignCard.displayName = 'SignCard';
