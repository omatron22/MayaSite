import { useState, useRef, useEffect, useCallback } from 'react';
import { clickableProps } from '../ui/ClickableCell';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';

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

  const close = useCallback(() => {
    setOpen(false);
    setFilter('');
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  useDropdownKeyboard(open, close);

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

  const handleToggle = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
      // Only toggle open if clicking the cell itself, not the popup content.
      const target = e.target as HTMLElement;
      const cell = containerRef.current;
      if (cell && (target === cell || target.closest('td') === cell)) {
        setOpen((o) => !o);
      }
    },
    []
  );

  return (
    <td
      // eslint-disable-next-line react-hooks/refs -- containerRef.current is read inside a click handler, not during render
      {...clickableProps(handleToggle, { ariaLabel: label })}
      aria-expanded={open}
      aria-haspopup="listbox"
      ref={containerRef}
      className="px-3 py-1 relative cursor-pointer focus-cell"
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
                        <td
                          key={option}
                          {...clickableProps(() => onToggle(option), { role: 'option', ariaSelected: selected.includes(option) })}
                          className="px-3 py-1 cursor-pointer whitespace-nowrap focus-cell"
                        >
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
