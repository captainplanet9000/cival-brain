'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DocRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // This page exists for direct URL access; redirect to home with slug param
    // For simplicity, the SPA handles everything on /
    router.push('/');
  }, [router]);

  return <div style={{ padding: 40, color: '#888' }}>Loading...</div>;
}
