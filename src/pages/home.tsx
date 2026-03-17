import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

function MayaCalendar() {
  const daySignMarks = Array.from({ length: 20 }, (_, i) => {
    const angle = i * 18 + 9;
    switch (i % 4) {
      case 0:
        return <circle key={i} className="glyph-line" cx="150" cy="26" r="3" strokeWidth="1" transform={`rotate(${angle}, 150, 150)`} />;
      case 1:
        return <line key={i} className="glyph-line" x1="150" y1="21" x2="150" y2="31" strokeWidth="1.5" transform={`rotate(${angle}, 150, 150)`} />;
      case 2:
        return (
          <g key={i} transform={`rotate(${angle}, 150, 150)`}>
            <circle className="glyph-line" cx="147" cy="26" r="2" strokeWidth="0.8" />
            <circle className="glyph-line" cx="153" cy="26" r="2" strokeWidth="0.8" />
          </g>
        );
      case 3:
        return (
          <g key={i} transform={`rotate(${angle}, 150, 150)`}>
            <line className="glyph-line" x1="147" y1="26" x2="153" y2="26" strokeWidth="1" />
            <line className="glyph-line" x1="150" y1="23" x2="150" y2="29" strokeWidth="1" />
          </g>
        );
    }
  });

  const numeralMarks = Array.from({ length: 13 }, (_, i) => {
    const angle = i * (360 / 13);
    if (i % 3 === 0) {
      return <line key={i} className="glyph-line" x1="145" y1="70" x2="155" y2="70" strokeWidth="2" transform={`rotate(${angle}, 150, 150)`} />;
    }
    return <circle key={i} className="glyph-line" cx="150" cy="70" r="2.5" strokeWidth="1" transform={`rotate(${angle}, 150, 150)`} />;
  });

  return (
    <svg viewBox="0 0 300 300" fill="none" className="w-full h-full" role="img" aria-label="Maya calendar glyph">
      {/* Outer border */}
      <g className="glyph-g1">
        <circle className="glyph-line" cx="150" cy="150" r="142" strokeWidth="2.5" />
        <circle className="glyph-line" cx="150" cy="150" r="136" strokeWidth="1" />
      </g>

      {/* 20 radial dividers */}
      <g className="glyph-g2">
        {Array.from({ length: 20 }, (_, i) => (
          <line key={i} className="glyph-line" x1="150" y1="14" x2="150" y2="38" strokeWidth="1.5" transform={`rotate(${i * 18}, 150, 150)`} />
        ))}
      </g>

      {/* Day sign ring */}
      <g className="glyph-g3">
        <circle className="glyph-line" cx="150" cy="150" r="112" strokeWidth="1.5" />
        {daySignMarks}
      </g>

      {/* Numeral ring */}
      <g className="glyph-g4">
        <circle className="glyph-line" cx="150" cy="150" r="90" strokeWidth="1" />
        <circle className="glyph-line" cx="150" cy="150" r="70" strokeWidth="1" />
        {numeralMarks}
      </g>

      {/* Center sun */}
      <g className="glyph-g5">
        <circle className="glyph-line" cx="150" cy="150" r="50" strokeWidth="2" />
        <circle className="glyph-line" cx="150" cy="150" r="35" strokeWidth="1.5" />
        <line className="glyph-line" x1="150" y1="115" x2="150" y2="185" strokeWidth="1.5" />
        <line className="glyph-line" x1="115" y1="150" x2="185" y2="150" strokeWidth="1.5" />
      </g>

      {/* Center filled dots */}
      <circle cx="150" cy="150" r="8" fill="#374151" className="glyph-fill" style={{ animationDelay: '1.4s' }} />
      <circle cx="137" cy="137" r="3" fill="#374151" className="glyph-fill" style={{ animationDelay: '1.55s' }} />
      <circle cx="163" cy="137" r="3" fill="#374151" className="glyph-fill" style={{ animationDelay: '1.6s' }} />
      <circle cx="137" cy="163" r="3" fill="#374151" className="glyph-fill" style={{ animationDelay: '1.65s' }} />
      <circle cx="163" cy="163" r="3" fill="#374151" className="glyph-fill" style={{ animationDelay: '1.7s' }} />
    </svg>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasParams = searchParams.toString().length > 0;

  useEffect(() => {
    if (hasParams) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, hasParams]);

  if (hasParams) {
    return <Navigate to={`/search?${searchParams.toString()}`} replace />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center -mt-10">
        <div className="w-[220px] h-[220px] max-md:w-[160px] max-md:h-[160px] mb-8">
          <MayaCalendar />
        </div>

        <h1 className="text-xl font-[600] text-black mb-2 glyph-reveal" style={{ animationDelay: '1.7s' }}>
          Maya Database
        </h1>

        <p className="text-black text-sm mb-8 glyph-reveal" style={{ animationDelay: '1.9s' }}>
          A Digital Archive of Hieroglyphic Writing
        </p>

        <Link
          to="/search"
          className="glyph-reveal no-underline text-sm font-[600] text-black border-2 border-black rounded-sm px-6 py-2.5   "
          style={{ animationDelay: '2.1s' }}
        >
          Explore the Catalog
        </Link>
      </div>
    </div>
  );
}
