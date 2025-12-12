import { Link } from 'react-router-dom';
import type { Sign } from '../types/database';

interface SignCardProps {
  sign: Sign & { instance_count: number };
}

export function SignCard({ sign }: SignCardProps) {
  return (
    <Link to={`/sign/${sign.id}`} className="sign-card">
      <div className="sign-ids">
        {sign.bonn_id && <span className="id-badge bonn">Bonn: {sign.bonn_id}</span>}
        {sign.thompson_id && <span className="id-badge thompson">T: {sign.thompson_id}</span>}
        {sign.mhd_id && <span className="id-badge mhd">MHD: {sign.mhd_id}</span>}
      </div>
      {sign.phonetic_value && (
        <div className="phonetic">/{sign.phonetic_value}/</div>
      )}
      <div className="instance-count">
        {sign.instance_count} instance{sign.instance_count !== 1 ? 's' : ''}
      </div>
    </Link>
  );
}
