import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const supabase = getServiceSupabase();

  try {
    // Create memory_nodes table
    const { error: nodesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS memory_nodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          label TEXT NOT NULL,
          type TEXT NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          embedding_text TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_type ON memory_nodes(type);
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_label ON memory_nodes(label);
      `
    });

    if (nodesError) {
      console.error('Nodes table error:', nodesError);
    }

    // Create memory_edges table
    const { error: edgesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS memory_edges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_node_id UUID REFERENCES memory_nodes(id) ON DELETE CASCADE,
          target_node_id UUID REFERENCES memory_nodes(id) ON DELETE CASCADE,
          relationship TEXT NOT NULL,
          weight FLOAT DEFAULT 1.0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_memory_edges_source ON memory_edges(source_node_id);
        CREATE INDEX IF NOT EXISTS idx_memory_edges_target ON memory_edges(target_node_id);
      `
    });

    if (edgesError) {
      console.error('Edges table error:', edgesError);
    }

    return NextResponse.json({
      success: true,
      message: 'Graph memory tables created successfully',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
    }, { status: 500 });
  }
}
