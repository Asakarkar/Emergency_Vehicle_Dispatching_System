import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Disjoint Set Union (DSU) for Kruskal's Algorithm
class DisjointSet {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(node: string) {
    this.parent.set(node, node);
    this.rank.set(node, 0);
  }

  find(node: string): string {
    if (this.parent.get(node) !== node) {
      this.parent.set(node, this.find(this.parent.get(node)!));
    }
    return this.parent.get(node)!;
  }

  union(node1: string, node2: string): boolean {
    const root1 = this.find(node1);
    const root2 = this.find(node2);

    if (root1 === root2) return false;

    const rank1 = this.rank.get(root1)!;
    const rank2 = this.rank.get(root2)!;

    if (rank1 < rank2) {
      this.parent.set(root1, root2);
    } else if (rank1 > rank2) {
      this.parent.set(root2, root1);
    } else {
      this.parent.set(root2, root1);
      this.rank.set(root1, rank1 + 1);
    }

    return true;
  }
}

interface Edge {
  id: string;
  source_zip_id: string;
  dest_zip_id: string;
  weight: number;
}

interface ZipCode {
  id: string;
  code: string;
  name: string;
  ambulance_count: number;
  fire_truck_count: number;
  police_count: number;
}

// Kruskal's Algorithm to find MST
function kruskalMST(edges: Edge[], nodes: Set<string>): Edge[] {
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  const dsu = new DisjointSet();
  const mstEdges: Edge[] = [];

  // Initialize disjoint sets
  nodes.forEach(node => dsu.makeSet(node));

  // Build MST
  for (const edge of sortedEdges) {
    if (dsu.union(edge.source_zip_id, edge.dest_zip_id)) {
      mstEdges.push(edge);
      if (mstEdges.length === nodes.size - 1) break;
    }
  }

  return mstEdges;
}

// BFS to find shortest path in MST
function findShortestPath(
  mstEdges: Edge[],
  sourceId: string,
  targetId: string,
  zipCodes: Map<string, ZipCode>
): { path: string[], distance: number } {
  const graph = new Map<string, Array<{ node: string; weight: number }>>();

  // Build adjacency list from MST edges
  mstEdges.forEach(edge => {
    if (!graph.has(edge.source_zip_id)) graph.set(edge.source_zip_id, []);
    if (!graph.has(edge.dest_zip_id)) graph.set(edge.dest_zip_id, []);

    graph.get(edge.source_zip_id)!.push({ node: edge.dest_zip_id, weight: edge.weight });
    graph.get(edge.dest_zip_id)!.push({ node: edge.source_zip_id, weight: edge.weight });
  });

  // BFS with distance tracking
  const queue: Array<{ node: string; path: string[]; distance: number }> = [
    { node: sourceId, path: [sourceId], distance: 0 }
  ];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const { node, path, distance } = queue.shift()!;

    if (node === targetId) {
      return { path: path.map(id => zipCodes.get(id)!.code), distance };
    }

    const neighbors = graph.get(node) || [];
    for (const { node: neighbor, weight } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          node: neighbor,
          path: [...path, neighbor],
          distance: distance + weight
        });
      }
    }
  }

  return { path: [], distance: 0 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sourceZipCode, vehicleType } = await req.json();

    console.log('Dispatch request:', { sourceZipCode, vehicleType });

    // Fetch all zip codes
    const { data: zipCodes, error: zipError } = await supabase
      .from('zip_codes')
      .select('*');

    if (zipError) throw zipError;

    const zipCodeMap = new Map(zipCodes.map((z: ZipCode) => [z.id, z]));
    const sourceZip = zipCodes.find((z: ZipCode) => z.code === sourceZipCode);

    if (!sourceZip) {
      throw new Error('Source zip code not found');
    }

    // Check vehicle availability at source
    const vehicleCountKey = `${vehicleType}_count` as keyof ZipCode;
    const availableAtSource = sourceZip[vehicleCountKey] as number > 0;

    if (availableAtSource) {
      // Dispatch from source
      await supabase
        .from('zip_codes')
        .update({ [vehicleCountKey]: sourceZip[vehicleCountKey] as number - 1 })
        .eq('id', sourceZip.id);

      await supabase
        .from('dispatch_logs')
        .insert({
          vehicle_type: vehicleType,
          source_zip_code: sourceZipCode,
          dest_zip_code: sourceZipCode,
          path: [sourceZipCode],
          distance: 0
        });

      return new Response(
        JSON.stringify({
          success: true,
          dispatched: true,
          sourceZipCode,
          destZipCode: sourceZipCode,
          path: [sourceZipCode],
          distance: 0,
          message: `${vehicleType} dispatched from ${sourceZipCode}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest available zip code using MST
    const { data: edges, error: edgesError } = await supabase
      .from('edges')
      .select('*');

    if (edgesError) throw edgesError;

    // Build MST
    const allNodes = new Set(zipCodes.map((z: ZipCode) => z.id));
    const mstEdges = kruskalMST(edges, allNodes);

    console.log('MST computed with', mstEdges.length, 'edges');

    // Find nearest zip with available vehicle
    let nearestZip: ZipCode | null = null;
    let shortestPath: string[] = [];
    let shortestDistance = Infinity;

    for (const zip of zipCodes) {
      if (zip.id !== sourceZip.id && (zip[vehicleCountKey] as number) > 0) {
        const { path, distance } = findShortestPath(mstEdges, sourceZip.id, zip.id, zipCodeMap);
        
        if (distance > 0 && distance < shortestDistance) {
          shortestDistance = distance;
          shortestPath = path;
          nearestZip = zip;
        }
      }
    }

    if (!nearestZip) {
      throw new Error(`No available ${vehicleType} found in any connected zip code`);
    }

    // Update vehicle count
    await supabase
      .from('zip_codes')
      .update({ [vehicleCountKey]: nearestZip[vehicleCountKey] as number - 1 })
      .eq('id', nearestZip.id);

    // Log dispatch
    await supabase
      .from('dispatch_logs')
      .insert({
        vehicle_type: vehicleType,
        source_zip_code: sourceZipCode,
        dest_zip_code: nearestZip.code,
        path: shortestPath,
        distance: shortestDistance
      });

    return new Response(
      JSON.stringify({
        success: true,
        dispatched: true,
        sourceZipCode,
        destZipCode: nearestZip.code,
        path: shortestPath,
        distance: shortestDistance,
        mstEdges: mstEdges.map(e => ({
          source: zipCodeMap.get(e.source_zip_id)!.code,
          dest: zipCodeMap.get(e.dest_zip_id)!.code,
          weight: e.weight
        })),
        message: `${vehicleType} dispatched from ${nearestZip.code} to ${sourceZipCode} (${shortestDistance} km)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dispatch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
