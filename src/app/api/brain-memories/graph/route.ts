import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET - Retrieve all nodes and edges
export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const { data: nodes, error: nodesError } = await supabase
      .from('memory_nodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (nodesError) throw nodesError;

    const { data: edges, error: edgesError } = await supabase
      .from('memory_edges')
      .select('*')
      .order('created_at', { ascending: false });

    if (edgesError) throw edgesError;

    return NextResponse.json({
      success: true,
      nodes: nodes || [],
      edges: edges || [],
    });
  } catch (error) {
    console.error('Graph fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch graph',
    }, { status: 500 });
  }
}

// POST - Create nodes and edges
export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { nodes, edges } = await request.json();

  try {
    let createdNodes = [];
    let createdEdges = [];

    // Insert nodes
    if (nodes && nodes.length > 0) {
      const { data, error } = await supabase
        .from('memory_nodes')
        .insert(nodes)
        .select();

      if (error) throw error;
      createdNodes = data || [];
    }

    // Insert edges
    if (edges && edges.length > 0) {
      const { data, error } = await supabase
        .from('memory_edges')
        .insert(edges)
        .select();

      if (error) throw error;
      createdEdges = data || [];
    }

    return NextResponse.json({
      success: true,
      nodes: createdNodes,
      edges: createdEdges,
    });
  } catch (error) {
    console.error('Graph create error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create graph data',
    }, { status: 500 });
  }
}
