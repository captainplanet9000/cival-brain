import { NextResponse } from 'next/server';
import { getDocument } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugStr = slug.join('/');
  const doc = getDocument(slugStr);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}
