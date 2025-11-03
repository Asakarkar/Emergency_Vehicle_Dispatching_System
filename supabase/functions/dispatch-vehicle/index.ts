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
  is_ambulance_depot: boolean;
  is_fire_truck_depot: boolean;
  is_police_depot: boolean;
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

// Dijkstra's algorithm to find shortest path
function findShortestPath(
  edges: Edge[],
  sourceId: string,
  targetId: string,
  zipCodes: Map<string, ZipCode>
): { path: string[], distance: number } {
  const graph = new Map<string, Array<{ node: string; weight: number }>>();
  
  // Build adjacency list from all edges
  edges.forEach(edge => {
    if (!graph.has(edge.source_zip_id)) graph.set(edge.source_zip_id, []);
    if (!graph.has(edge.dest_zip_id)) graph.set(edge.dest_zip_id, []);
    
    graph.get(edge.source_zip_id)!.push({ node: edge.dest_zip_id, weight: edge.weight });
    graph.get(edge.dest_zip_id)!.push({ node: edge.source_zip_id, weight: edge.weight });
  });

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  // Initialize
  zipCodes.forEach((_, id) => {
    distances.set(id, Infinity);
    previous.set(id, null);
    unvisited.add(id);
  });
  distances.set(sourceId, 0);

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minNode: string | null = null;
    let minDist = Infinity;
    unvisited.forEach(node => {
      const dist = distances.get(node)!;
      if (dist < minDist) {
        minDist = dist;
        minNode = node;
      }
    });

    if (minNode === null || minDist === Infinity) break;
    
    unvisited.delete(minNode);
    
    if (minNode === targetId) break;

    // Update distances to neighbors
    const neighbors = graph.get(minNode) || [];
    neighbors.forEach(({ node: neighbor, weight }) => {
      if (unvisited.has(neighbor)) {
        const alt = distances.get(minNode!)! + weight;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, minNode);
        }
      }
    });
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = targetId;
  
  while (current !== null) {
    path.unshift(zipCodes.get(current)!.code);
    current = previous.get(current) || null;
  }

  return { 
    path: path.length > 1 ? path : [], 
    distance: distances.get(targetId) || 0 
  };
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

    const { destinationZipCode, vehicleType } = await req.json();

    console.log('Dispatch request:', { destinationZipCode, vehicleType });

    // Fetch all zip codes
    const { data: zipCodes, error: zipError } = await supabase
      .from('zip_codes')
      .select('*');

    if (zipError) throw zipError;

    const zipCodeMap = new Map(zipCodes.map((z: ZipCode) => [z.id, z]));
    const destZip = zipCodes.find((z: ZipCode) => z.code === destinationZipCode);

    if (!destZip) {
      throw new Error('Destination zip code not found');
    }

    // Find depot for the vehicle type
    const depotFlagKey = `is_${vehicleType}_depot` as keyof ZipCode;
    const depotZip = zipCodes.find((z: ZipCode) => z[depotFlagKey] === true);

    if (!depotZip) {
      throw new Error(`No depot found for ${vehicleType}`);
    }

    // Check vehicle availability at depot
    const vehicleCountKey = `${vehicleType}_count` as keyof ZipCode;
    const availableAtDepot = depotZip[vehicleCountKey] as number > 0;

    if (!availableAtDepot) {
      throw new Error(`No ${vehicleType} available at depot ${depotZip.code}`);
    }

    // If destination is the depot itself
    if (depotZip.id === destZip.id) {
      await supabase
        .from('zip_codes')
        .update({ [vehicleCountKey]: depotZip[vehicleCountKey] as number - 1 })
        .eq('id', depotZip.id);

      await supabase
        .from('dispatch_logs')
        .insert({
          vehicle_type: vehicleType,
          source_zip_code: depotZip.code,
          dest_zip_code: destinationZipCode,
          path: [destinationZipCode],
          distance: 0
        });

      return new Response(
        JSON.stringify({
          success: true,
          dispatched: true,
          sourceZipCode: depotZip.code,
          destZipCode: destinationZipCode,
          path: [destinationZipCode],
          distance: 0,
          message: `${vehicleType} dispatched from depot ${depotZip.code} to ${destinationZipCode}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all edges
    const { data: edges, error: edgesError } = await supabase
      .from('edges')
      .select('*');

    if (edgesError) throw edgesError;

    // Build MST for visualization
    const allNodes = new Set(zipCodes.map((z: ZipCode) => z.id));
    const mstEdges = kruskalMST(edges, allNodes);

    console.log('MST computed with', mstEdges.length, 'edges');

    // Find shortest path from depot to destination using Dijkstra
    const { path, distance } = findShortestPath(edges, depotZip.id, destZip.id, zipCodeMap);

    if (path.length === 0) {
      throw new Error(`No path found from depot ${depotZip.code} to ${destinationZipCode}`);
    }

    // Update vehicle count at depot
    await supabase
      .from('zip_codes')
      .update({ [vehicleCountKey]: depotZip[vehicleCountKey] as number - 1 })
      .eq('id', depotZip.id);

    // Log dispatch
    await supabase
      .from('dispatch_logs')
      .insert({
        vehicle_type: vehicleType,
        source_zip_code: depotZip.code,
        dest_zip_code: destinationZipCode,
        path: path,
        distance: distance
      });

    return new Response(
      JSON.stringify({
        success: true,
        dispatched: true,
        sourceZipCode: depotZip.code,
        destZipCode: destinationZipCode,
        path: path,
        distance: distance,
        mstEdges: mstEdges.map(e => ({
          source: zipCodeMap.get(e.source_zip_id)!.code,
          dest: zipCodeMap.get(e.dest_zip_id)!.code,
          weight: e.weight
        })),
        message: `${vehicleType} dispatched from depot ${depotZip.code} to ${destinationZipCode} (${distance} km)`
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
