import { NavLink } from 'react-router-dom';
import { BookIcon, BulbIcon, GaugeIcon, PlusIcon, TargetIcon } from './icons';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: GaugeIcon },
  { to: '/log', label: 'Log activity', icon: PlusIcon },
  { to: '/insights', label: 'Insights', icon: BulbIcon },
  { to: '/actions', label: 'Actions', icon: TargetIcon },
  { to: '/understand', label: 'Understand', icon: BookIcon },
] as const;

/**
 * Primary navigation. NavLink sets aria-current="page" on the active
 * route automatically, which the styles also use for the visual state —
 * meaning is never conveyed by color alone. Icons are decorative
 * (aria-hidden); the text label always carries the link's meaning.
 */
export function Nav(): JSX.Element {
  return (
    <nav aria-label="Primary">
      <ul>
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.to === '/'}>
              <link.icon />
              <span>{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
