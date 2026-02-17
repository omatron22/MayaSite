import { memo } from 'react';
import { Link } from 'react-router-dom';

interface SignCardProps {
  sign: {
    id: number;
    display_code: string;
    primary_image_url?: string | null;
    thompson_code?: string | null;
    syllabic_value?: string | null;
    english_translation?: string | null;
    word_class?: string | null;
    grapheme_count: number;
    roboflow_count: number;
  };
}

export const SignCard = memo(({ sign }: SignCardProps) => (
  <Link
    to={`/sign/${sign.id}`}
    className="border border-gray-200 rounded-lg overflow-hidden no-underline flex flex-col hover:bg-gray-50 group"
  >
    <div className="w-12 h-12 mx-auto mt-3 bg-gray-50 flex items-center justify-center">
      {sign.primary_image_url ? (
        <img src={sign.primary_image_url} alt={sign.display_code} loading="lazy" width={48} height={48} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      )}
    </div>
    <div className="p-3 flex flex-col gap-1">
      <div className="text-sm font-semibold text-gray-900">{sign.display_code}</div>
      {sign.thompson_code && <div className="text-xs text-gray-500">T{sign.thompson_code}</div>}
      {sign.syllabic_value && <div className="text-blue-600 italic text-xs">{sign.syllabic_value}</div>}
      {sign.english_translation && (
        <div className="text-xs text-gray-500 overflow-hidden text-ellipsis line-clamp-2 leading-snug">
          &quot;{sign.english_translation}&quot;
        </div>
      )}
      {sign.word_class && (
        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{sign.word_class}</div>
      )}
      <div className="flex gap-3 text-[10px] font-medium mt-0.5">
        {sign.grapheme_count > 0 && (
          <span className="text-gray-500">{sign.grapheme_count} uses</span>
        )}
        {sign.roboflow_count > 0 && (
          <span className="text-gray-500">{sign.roboflow_count} ML</span>
        )}
      </div>
    </div>
  </Link>
));

SignCard.displayName = 'SignCard';
