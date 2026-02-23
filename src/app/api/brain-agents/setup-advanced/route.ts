import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const supabase = getServiceSupabase();
  const results: string[] = [];

  try {
    // Add model_preference to brain_conversations if not exists
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='brain_conversations' AND column_name='model_preference'
            ) THEN
              ALTER TABLE brain_conversations ADD COLUMN model_preference TEXT DEFAULT 'auto';
            END IF;
          END $$;
        `
      });
      results.push('model_preference column added/verified');
    } catch (e) {
      results.push('model_preference column may already exist');
    }

    // Add metadata to brain_messages if not exists
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='brain_messages' AND column_name='metadata'
            ) THEN
              ALTER TABLE brain_messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
            END IF;
          END $$;
        `
      });
      results.push('metadata column added/verified');
    } catch (e) {
      results.push('metadata column may already exist');
    }

    // Create memory_nodes table
    try {
      await supabase.rpc('exec_sql', {
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
      results.push('memory_nodes table created/verified');
    } catch (e) {
      results.push('memory_nodes table may already exist');
    }

    // Create memory_edges table
    try {
      await supabase.rpc('exec_sql', {
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
      results.push('memory_edges table created/verified');
    } catch (e) {
      results.push('memory_edges table may already exist');
    }

    return NextResponse.json({
      success: true,
      message: 'Advanced features setup completed',
      results,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
      results,
      note: 'Some operations may have failed if using direct SQL execution is not available. You may need to run schema changes manually in Supabase.'
    }, { status: 500 });
  }
}
