import { NextResponse } from 'next/server';
import { getAllDocuments, getDocMeta } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export async function GET() {
  const docs = getAllDocuments();
  const meta = docs.map(getDocMeta);
  return NextResponse.json(meta);
}
