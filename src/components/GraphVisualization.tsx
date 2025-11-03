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
  is_ambulance_depot: boolean;
  is_fire_truck_depot: boolean;
  is_police_depot: boolean;
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

    // Create nodes with vehicle counts and depot indicators
    const nodes = new DataSet(
      zipCodes.map((zip) => {
        let depotLabel = '';
        let depotColor = 'hsl(var(--card))';
        let borderColor = 'hsl(var(--border))';
        let borderWidth = 2;
        
        if (zip.is_ambulance_depot) {
          depotLabel = '\n🏥 AMBULANCE DEPOT';
          depotColor = 'hsl(var(--emergency-red) / 0.15)';
          borderColor = 'hsl(var(--emergency-red))';
          borderWidth = 4;
        } else if (zip.is_fire_truck_depot) {
          depotLabel = '\n🚒 FIRE DEPOT';
          depotColor = 'hsl(var(--emergency-orange) / 0.15)';
          borderColor = 'hsl(var(--emergency-orange))';
          borderWidth = 4;
        } else if (zip.is_police_depot) {
          depotLabel = '\n👮 POLICE DEPOT';
          depotColor = 'hsl(var(--emergency-blue) / 0.15)';
          borderColor = 'hsl(var(--emergency-blue))';
          borderWidth = 4;
        }
        
        return {
          id: zip.code,
          label: `${zip.code}${depotLabel}\n🚑 ${zip.ambulance_count} 🚒 ${zip.fire_truck_count} 👮 ${zip.police_count}`,
          title: `${zip.name}\nAmbulance: ${zip.ambulance_count}\nFire Truck: ${zip.fire_truck_count}\nPolice: ${zip.police_count}`,
          color: {
            background: depotColor,
            border: borderColor,
            highlight: {
              background: 'hsl(var(--primary) / 0.2)',
              border: 'hsl(var(--primary))',
            },
          },
          borderWidth: borderWidth,
          font: {
            size: 12,
            color: 'hsl(var(--foreground))',
            face: 'Inter, system-ui, sans-serif',
            bold: zip.is_ambulance_depot || zip.is_fire_truck_depot || zip.is_police_depot ? '14px' : 'normal',
          },
        };
      })
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

    // Network options with improved styling
    const options = {
      nodes: {
        shape: 'box',
        size: 30,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        borderWidthSelected: 3,
        font: {
          size: 12,
          face: 'Inter, system-ui, sans-serif',
          multi: 'html',
        },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.1)',
          size: 8,
          x: 2,
          y: 2,
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'curvedCW',
          roundness: 0.2,
        },
        font: {
          size: 11,
          color: 'hsl(var(--muted-foreground))',
          strokeWidth: 3,
          strokeColor: 'hsl(var(--background))',
        },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.08)',
          size: 5,
        },
      },
      physics: {
        enabled: true,
        stabilization: {
          iterations: 300,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -3000,
          springConstant: 0.002,
          springLength: 180,
          damping: 0.3,
        },
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragView: true,
        tooltipDelay: 100,
        navigationButtons: true,
      },
      layout: {
        improvedLayout: true,
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
    <Card className="p-6 bg-gradient-to-br from-card to-muted/30">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-3">Network Visualization</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-card rounded-md border">
            <div className="w-8 h-0.5 bg-primary"></div>
            <span>MST Edges</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-card rounded-md border">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-border"></div>
            <span>Other Edges</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-card rounded-md border">
            <div className="w-8 h-1 bg-[hsl(var(--emergency-red))]"></div>
            <span>Active Path</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-card rounded-md border">
            <div className="w-6 h-6 rounded border-4 border-primary bg-primary/10"></div>
            <span>Depot</span>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[600px] bg-gradient-to-br from-background to-muted/20 rounded-xl border-2 shadow-inner"
      />
    </Card>
  );
}
