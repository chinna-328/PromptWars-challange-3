import { useEffect } from 'react';

/**
 * Sets a descriptive document title for the current route — each page
 * announces itself to screen readers and browser history.
 * @param title - page name, prefixed onto the app name
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} — EcoTrace`;
  }, [title]);
}
