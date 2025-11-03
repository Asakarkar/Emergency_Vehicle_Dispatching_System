import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VehicleSelector } from "@/components/VehicleSelector";
import { ZipCodeSelector } from "@/components/ZipCodeSelector";
import { StatsCard } from "@/components/StatsCard";
import { DispatchLogTable } from "@/components/DispatchLogTable";
import { GraphVisualization } from "@/components/GraphVisualization";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Ambulance, Flame, Shield, Siren } from "lucide-react";

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

interface DispatchLog {
  id: string;
  vehicle_type: string;
  source_zip_code: string;
  dest_zip_code: string;
  path: string[];
  distance: number;
  created_at: string;
}

export default function Index() {
  const [zipCodes, setZipCodes] = useState<ZipCode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [selectedZipCode, setSelectedZipCode] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [mstEdges, setMstEdges] = useState<Array<{ source: string; dest: string; weight: number }>>([]);
  const [dispatchPath, setDispatchPath] = useState<string[]>([]);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadData();
    
    // Subscribe to realtime updates
    const zipCodesChannel = supabase
      .channel('zip_codes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zip_codes' }, () => {
        loadZipCodes();
      })
      .subscribe();

    const logsChannel = supabase
      .channel('dispatch_logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispatch_logs' }, () => {
        loadDispatchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(zipCodesChannel);
      supabase.removeChannel(logsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadZipCodes(), loadEdges(), loadDispatchLogs()]);
  };

  const loadZipCodes = async () => {
    const { data, error } = await supabase
      .from('zip_codes')
      .select('*')
      .order('code');

    if (error) {
      toast({ title: "Error loading zip codes", variant: "destructive" });
      return;
    }

    setZipCodes(data || []);
  };

  const loadEdges = async () => {
    const { data, error } = await supabase.from('edges').select('*');

    if (error) {
      toast({ title: "Error loading edges", variant: "destructive" });
      return;
    }

    setEdges(data || []);
  };

  const loadDispatchLogs = async () => {
    const { data, error } = await supabase
      .from('dispatch_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      toast({ title: "Error loading dispatch logs", variant: "destructive" });
      return;
    }

    setDispatchLogs((data || []).map(log => ({
      ...log,
      path: (Array.isArray(log.path) ? log.path : []) as string[],
    })) as DispatchLog[]);
  };

  const handleDispatch = async () => {
    if (!selectedZipCode || !selectedVehicle) {
      toast({
        title: "Missing information",
        description: "Please select both a zip code and vehicle type",
        variant: "destructive",
      });
      return;
    }

    setIsDispatching(true);

    try {
      const { data, error } = await supabase.functions.invoke('dispatch-vehicle', {
        body: {
          destinationZipCode: selectedZipCode,
          vehicleType: selectedVehicle,
        },
      });

      if (error) throw error;

      if (data.success) {
        setMstEdges(data.mstEdges || []);
        setDispatchPath(data.path || []);

        toast({
          title: "Dispatch Successful",
          description: data.message,
        });

        // Reload data to reflect updated vehicle counts
        await loadData();
      } else {
        throw new Error(data.error || 'Dispatch failed');
      }
    } catch (error) {
      toast({
        title: "Dispatch Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const totalAmbulances = zipCodes.reduce((sum, zip) => sum + zip.ambulance_count, 0);
  const totalFireTrucks = zipCodes.reduce((sum, zip) => sum + zip.fire_truck_count, 0);
  const totalPolice = zipCodes.reduce((sum, zip) => sum + zip.police_count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Siren className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">Emergency Vehicle Dispatching System</h1>
              <p className="text-sm opacity-90">Using Kruskal's MST Algorithm for Optimal Routing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Available Ambulances"
            value={totalAmbulances}
            icon={Ambulance}
            color="hsl(var(--emergency-red))"
            bgColor="hsl(var(--emergency-red) / 0.1)"
          />
          <StatsCard
            title="Available Fire Trucks"
            value={totalFireTrucks}
            icon={Flame}
            color="hsl(var(--emergency-orange))"
            bgColor="hsl(var(--emergency-orange) / 0.1)"
          />
          <StatsCard
            title="Available Police Units"
            value={totalPolice}
            icon={Shield}
            color="hsl(var(--emergency-blue))"
            bgColor="hsl(var(--emergency-blue) / 0.1)"
          />
        </div>

        {/* Depot Information */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <h2 className="text-xl font-bold mb-4">Vehicle Depots</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {zipCodes.filter(z => z.is_ambulance_depot).map(depot => (
              <div key={depot.id} className="flex items-center gap-2 p-3 bg-card rounded-lg border">
                <Ambulance className="w-5 h-5" style={{ color: 'hsl(var(--emergency-red))' }} />
                <div>
                  <div className="font-semibold">{depot.code}</div>
                  <div className="text-xs text-muted-foreground">Ambulance Depot</div>
                </div>
              </div>
            ))}
            {zipCodes.filter(z => z.is_fire_truck_depot).map(depot => (
              <div key={depot.id} className="flex items-center gap-2 p-3 bg-card rounded-lg border">
                <Flame className="w-5 h-5" style={{ color: 'hsl(var(--emergency-orange))' }} />
                <div>
                  <div className="font-semibold">{depot.code}</div>
                  <div className="text-xs text-muted-foreground">Fire Truck Depot</div>
                </div>
              </div>
            ))}
            {zipCodes.filter(z => z.is_police_depot).map(depot => (
              <div key={depot.id} className="flex items-center gap-2 p-3 bg-card rounded-lg border">
                <Shield className="w-5 h-5" style={{ color: 'hsl(var(--emergency-blue))' }} />
                <div>
                  <div className="font-semibold">{depot.code}</div>
                  <div className="text-xs text-muted-foreground">Police Depot</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dispatch Control Panel */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-6">Emergency Dispatch</h2>
            
            <div className="space-y-6">
              {/* Zip Code Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Emergency Location</label>
                <ZipCodeSelector
                  zipCodes={zipCodes}
                  selectedZipCode={selectedZipCode}
                  onSelectZipCode={setSelectedZipCode}
                />
              </div>

              {/* Vehicle Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Emergency Vehicle Type</label>
                <VehicleSelector
                  selectedVehicle={selectedVehicle}
                  onSelectVehicle={setSelectedVehicle}
                />
              </div>

              {/* Dispatch Button */}
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold"
                onClick={handleDispatch}
                disabled={!selectedZipCode || !selectedVehicle || isDispatching}
              >
                {isDispatching ? (
                  <>
                    <Siren className="w-5 h-5 mr-2 animate-pulse" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Siren className="w-5 h-5 mr-2" />
                    Request Emergency Vehicle
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Graph Visualization */}
        <GraphVisualization
          zipCodes={zipCodes}
          edges={edges}
          mstEdges={mstEdges}
          dispatchPath={dispatchPath}
        />

        {/* Dispatch Logs */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Dispatches</h2>
          <DispatchLogTable logs={dispatchLogs} />
        </div>
      </div>
    </div>
  );
}
