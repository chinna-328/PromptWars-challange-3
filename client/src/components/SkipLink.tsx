/**
 * Skip-to-content link: visually hidden until focused, first in tab
 * order, jumps keyboard users straight past the navigation.
 */
export function SkipLink(): JSX.Element {
  return (
    <a className="skip-link" href="#main">
      Skip to main content
    </a>
  );
}
