import { useState, useRef, useEffect } from 'react';

interface PopupSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
  displayMap?: Map<string, string>;
}

export function PopupSelect({ label, options, selected, onToggle, onClear, displayMap }: PopupSelectProps) {
  const display = (v: string) => displayMap?.get(v) || v;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = filter
    ? options.filter(o => o.toLowerCase().includes(filter.toLowerCase()) || display(o).toLowerCase().includes(filter.toLowerCase()))
    : options;

  const summary = selected.length === 0
    ? '--'
    : selected.length <= 2
      ? selected.map(s => `[${display(s)}]`).join(' ')
      : `[${display(selected[0])}] +${selected.length - 1}`;

  return (
    <td
      className="px-3 py-1 relative cursor-pointer"
      ref={containerRef}
      onClick={(e) => {
        // Only toggle open if clicking the cell itself, not the popup content
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('td') === containerRef.current && !open) {
          setOpen(!open);
        }
      }}
    >
      <div className="w-[200px] overflow-hidden">
        <span className="text-xs block truncate">
          {selected.length > 0 ? <strong>{summary}</strong> : summary}
        </span>
      </div>

      {open && (
        <div
          className="absolute left-0 top-full z-50 bg-white border-2 border-black mt-[-2px] min-w-[280px] max-h-[320px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Filter input */}
          <div className="flex items-center px-3 py-2 border-b-2 border-black">
            <span className="font-[800] select-none text-xs shrink-0">&gt;&nbsp;</span>
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white text-black text-xs border-none outline-none w-full placeholder:text-black"
              placeholder={`filter ${label.toLowerCase().replace(':', '')}...`}
            />
          </div>

          {/* Options grid */}
          <div className="overflow-y-auto">
            <table className="w-full">
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-xs">No matches</td>
                  </tr>
                ) : (
                  chunkArray(filtered, 3).map((row, i) => (
                    <tr key={i}>
                      {row.map(option => (
                        <td key={option} className="px-3 py-1 cursor-pointer whitespace-nowrap" onClick={() => onToggle(option)}>
                          <span className="text-xs">
                            {selected.includes(option) ? <strong>[{display(option)}]</strong> : display(option)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1 border-t-2 border-black text-xs">
            <span>{selected.length > 0 ? `${selected.length} selected` : '\u00A0'}</span>
            {selected.length > 0 && onClear && (
              <button
                className="cursor-pointer no-underline text-xs font-[800]"
                onClick={() => { onClear(); setFilter(''); }}
              >
                [Clear]
              </button>
            )}
          </div>
        </div>
      )}
    </td>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
