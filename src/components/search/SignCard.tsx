import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

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
    variant_count?: number;
  };
}

export const SignCard = memo(({ sign }: SignCardProps) => {
  const navigate = useNavigate();
  return (
    <tr className="cursor-pointer" onClick={() => navigate(`/sign/${sign.id}`)}>
      <td className="px-2 py-1">
        <div className="flex items-center justify-center w-8 h-8">
          {sign.primary_image_url ? (
            <img src={sign.primary_image_url} alt={sign.display_code} loading="lazy" width={32} height={32} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="text-xs">--</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1 font-[800]">{sign.display_code}</td>
      <td className="px-2 py-1 text-xs">{sign.thompson_code ? `T${sign.thompson_code}` : '--'}</td>
      <td className="px-2 py-1 text-xs italic">{sign.syllabic_value || '--'}</td>
      <td className="px-2 py-1 text-xs max-w-[180px] truncate">{sign.english_translation ? `"${sign.english_translation}"` : '--'}</td>
      <td className="px-2 py-1 text-[10px] uppercase">{sign.word_class || '--'}</td>
      <td className="px-2 py-1 text-xs text-right">{sign.grapheme_count > 0 ? sign.grapheme_count : '--'}</td>
      <td className="px-2 py-1 text-xs text-right">{sign.roboflow_count > 0 ? sign.roboflow_count : '--'}</td>
    </tr>
  );
});

SignCard.displayName = 'SignCard';
