import { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { Card } from "@/components/ui/card";

interface ZipCode {
  id: string;
  code: string;
  name: string;
  ambulance_count: number;
  fire_truck_count: number;
  police_count: number;
}

interface Edge {
  id: string;
  source_zip_id: string;
  dest_zip_id: string;
  weight: number;
}

interface GraphVisualizationProps {
  zipCodes: ZipCode[];
  edges: Edge[];
  mstEdges?: Array<{ source: string; dest: string; weight: number }>;
  dispatchPath?: string[];
}

export function GraphVisualization({ zipCodes, edges, mstEdges, dispatchPath }: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || zipCodes.length === 0) return;

    // Create nodes with vehicle counts
    const nodes = new DataSet(
      zipCodes.map((zip) => ({
        id: zip.code,
        label: `${zip.code}\n🚑 ${zip.ambulance_count} 🚒 ${zip.fire_truck_count} 👮 ${zip.police_count}`,
        title: `${zip.name}\nAmbulance: ${zip.ambulance_count}\nFire Truck: ${zip.fire_truck_count}\nPolice: ${zip.police_count}`,
        color: {
          background: 'hsl(var(--card))',
          border: 'hsl(var(--border))',
          highlight: {
            background: 'hsl(var(--primary))',
            border: 'hsl(var(--primary))',
          },
        },
        font: {
          size: 14,
          color: 'hsl(var(--foreground))',
        },
      }))
    );

    // Create edges
    const edgeData = edges.map((edge) => {
      const sourceZip = zipCodes.find((z) => z.id === edge.source_zip_id);
      const destZip = zipCodes.find((z) => z.id === edge.dest_zip_id);
      
      // Check if this edge is in the MST
      const isInMST = mstEdges?.some(
        (mst) =>
          (mst.source === sourceZip?.code && mst.dest === destZip?.code) ||
          (mst.source === destZip?.code && mst.dest === sourceZip?.code)
      );

      // Check if this edge is in the dispatch path
      const isInPath = dispatchPath && sourceZip && destZip
        ? dispatchPath.includes(sourceZip.code) && dispatchPath.includes(destZip.code) &&
          Math.abs(dispatchPath.indexOf(sourceZip.code) - dispatchPath.indexOf(destZip.code)) === 1
        : false;

      return {
        id: edge.id,
        from: sourceZip?.code,
        to: destZip?.code,
        label: `${edge.weight} km`,
        color: {
          color: isInPath
            ? 'hsl(var(--emergency-red))'
            : isInMST
            ? 'hsl(var(--primary))'
            : 'hsl(var(--border))',
          highlight: 'hsl(var(--emergency-red))',
        },
        width: isInPath ? 4 : isInMST ? 3 : 1,
        dashes: !isInMST && !isInPath,
      };
    });

    const edgesDataSet = new DataSet(edgeData);

    // Network options
    const options = {
      nodes: {
        shape: 'box',
        size: 25,
        borderWidth: 2,
        font: {
          size: 14,
          face: 'monospace',
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
        font: {
          size: 12,
          color: 'hsl(var(--muted-foreground))',
        },
      },
      physics: {
        enabled: true,
        stabilization: {
          iterations: 200,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          springConstant: 0.001,
          springLength: 200,
        },
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragView: true,
      },
    };

    // Create network
    const network = new Network(containerRef.current, { nodes, edges: edgesDataSet }, options);
    networkRef.current = network;

    // Cleanup
    return () => {
      network.destroy();
    };
  }, [zipCodes, edges, mstEdges, dispatchPath]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Dispatch Network Graph</h3>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary"></div>
            <span>MST Edges</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-border"></div>
            <span>Other Edges</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-[hsl(var(--emergency-red))]"></div>
            <span>Dispatch Path</span>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[500px] bg-background rounded-lg border"
      />
    </Card>
  );
}
