import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ambulance, Flame, Shield, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface DispatchLog {
  id: string;
  vehicle_type: string;
  source_zip_code: string;
  dest_zip_code: string;
  path: string[];
  distance: number;
  created_at: string;
}

interface DispatchLogTableProps {
  logs: DispatchLog[];
}

const vehicleIcons = {
  ambulance: Ambulance,
  fire_truck: Flame,
  police: Shield,
};

const vehicleColors = {
  ambulance: 'hsl(var(--emergency-red))',
  fire_truck: 'hsl(var(--emergency-orange))',
  police: 'hsl(var(--emergency-blue))',
};

export function DispatchLogTable({ logs }: DispatchLogTableProps) {
  if (logs.length === 0) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">No dispatches recorded yet</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle Type</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const Icon = vehicleIcons[log.vehicle_type as keyof typeof vehicleIcons];
            const color = vehicleColors[log.vehicle_type as keyof typeof vehicleColors];
            
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color }} />
                    <span className="capitalize font-medium">
                      {log.vehicle_type.replace('_', ' ')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{log.source_zip_code}</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="secondary">{log.dest_zip_code}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {log.path.map((zip, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        {zip}{idx < log.path.length - 1 && ' →'}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold">{log.distance} km</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(log.created_at), 'HH:mm:ss')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
