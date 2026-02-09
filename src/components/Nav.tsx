'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/tasks', label: 'Tasks', icon: '📋' },
  { href: '/documents', label: 'Docs', icon: '📄' },
  { href: '/pinboard', label: 'Pins', icon: '📌' },
  { href: '/timeline', label: 'Timeline', icon: '⏳' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/digests', label: 'Digests', icon: '📰' },
  { href: '/ops', label: 'Ops', icon: '🎯' },
  { href: '/projects', label: 'Projects', icon: '🏢' },
  { href: '/marketing', label: 'Marketing', icon: '📢' },
  { href: '/revenue', label: 'Revenue', icon: '💰' },
  { href: '/scripts', label: 'Scripts', icon: '✍️' },
  { href: '/chat', label: 'Chat', icon: '💬' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: '52px',
        borderBottom: '1px solid oklch(0.28 0.015 260)',
        background: 'oklch(0.17 0.01 260 / 0.92)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '12px',
      }}>
        {/* Brand */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontSize: '0.92rem',
          color: 'oklch(0.93 0.01 260)',
          textDecoration: 'none',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '18px' }}>🧠</span>
          <span>Cival Brain</span>
        </Link>

        {/* Desktop nav links */}
        <div style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
          flex: 1,
          overflow: 'hidden',
        }} className="desktop-nav">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: isActive(l.href) ? 'oklch(0.65 0.18 250)' : 'oklch(0.65 0.02 260)',
                background: isActive(l.href) ? 'oklch(0.25 0.06 250)' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '13px' }}>{l.icon}</span>
              <span className="nav-label-text">{l.label}</span>
            </Link>
          ))}
        </div>

        {/* Search shortcut - desktop only */}
        <Link href="/search" className="desktop-nav" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'oklch(0.19 0.012 260)',
          border: '1px solid oklch(0.28 0.015 260)',
          borderRadius: '8px',
          padding: '6px 12px',
          color: 'oklch(0.50 0.015 260)',
          fontSize: '0.82rem',
          textDecoration: 'none',
          flexShrink: 0,
        }}>
          <span>🔍</span>
          <kbd style={{
            fontSize: '0.7rem',
            background: 'oklch(0.22 0.014 260)',
            border: '1px solid oklch(0.28 0.015 260)',
            borderRadius: '4px',
            padding: '1px 5px',
            color: 'oklch(0.50 0.015 260)',
          }}>⌘K</kbd>
        </Link>

        {/* Hamburger button - mobile only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-hamburger"
          style={{
            display: 'none', // shown via CSS media query
            background: 'none',
            border: 'none',
            color: 'oklch(0.93 0.01 260)',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px',
            marginLeft: 'auto',
            lineHeight: 1,
          }}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              top: '52px',
              background: 'oklch(0 0 0 / 0.5)',
              zIndex: 199,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '52px',
            right: 0,
            bottom: 0,
            width: '260px',
            background: 'oklch(0.17 0.01 260)',
            borderLeft: '1px solid oklch(0.28 0.015 260)',
            zIndex: 200,
            overflowY: 'auto',
            padding: '12px 0',
            animation: 'slideInRight 200ms ease',
          }}>
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: isActive(l.href) ? 'oklch(0.65 0.18 250)' : 'oklch(0.85 0.01 260)',
                  background: isActive(l.href) ? 'oklch(0.25 0.06 250)' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive(l.href) ? '3px solid oklch(0.65 0.18 250)' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: '18px' }}>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
