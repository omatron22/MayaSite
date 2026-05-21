import { useEffect } from 'react';

/**
 * While the dropdown is open, listen for the Escape key and close it.
 * Combine with the existing "click outside" effect.
 */
export function useDropdownKeyboard(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);
}
