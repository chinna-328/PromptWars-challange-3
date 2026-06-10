import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Log activity' },
  { to: '/insights', label: 'Insights' },
  { to: '/actions', label: 'Actions' },
  { to: '/understand', label: 'Understand' },
] as const;

/**
 * Primary navigation. NavLink sets aria-current="page" on the active
 * route automatically, which the styles also use for the visual state —
 * meaning is never conveyed by color alone.
 */
export function Nav(): JSX.Element {
  return (
    <nav aria-label="Primary">
      <ul>
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
