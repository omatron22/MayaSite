import type { KeyboardEvent, MouseEvent } from 'react';

type ClickableOpts = {
  /** Override role; defaults to "button" (or "tab" if ariaSelected is set). */
  role?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaSelected?: boolean;
};

/**
 * Returns the props needed to make a non-native element (td/div) behave like
 * a button for keyboard + screen-reader users: focusable, activated by
 * Enter/Space, with an explicit role and visible focus outline (via the
 * "focus-cell" utility class in globals.css).
 *
 * Usage: `<td {...clickableProps(handler)} className="...">...</td>`
 */
export function clickableProps(
  onClick: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void,
  opts: ClickableOpts = {}
) {
  const role = opts.role ?? (opts.ariaSelected !== undefined ? 'tab' : 'button');
  return {
    role,
    tabIndex: 0,
    'aria-label': opts.ariaLabel,
    'aria-pressed': opts.ariaPressed,
    'aria-selected': opts.ariaSelected,
    onClick,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}
