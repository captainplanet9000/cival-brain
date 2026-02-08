'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/tasks', label: 'Tasks', icon: '📋' },
  { href: '/documents', label: 'Docs', icon: '📄' },
  { href: '/pinboard', label: 'Pinboard', icon: '📌' },
  { href: '/timeline', label: 'Timeline', icon: '⏳' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/digests', label: 'Digests', icon: '📰' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <span className="nav-logo">🧠</span>
        <span className="nav-title">Cival Brain</span>
      </div>
      <div className="nav-links">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link${pathname === l.href ? ' active' : ''}`}
          >
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <Link href="/search" className="search-trigger">
          <span>🔍</span>
          <span className="search-text">Search</span>
          <kbd>⌘K</kbd>
        </Link>
      </div>
    </nav>
  );
}
