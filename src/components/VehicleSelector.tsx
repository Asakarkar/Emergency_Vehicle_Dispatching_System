import { Card } from "@/components/ui/card";
import { Ambulance, Flame, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleSelectorProps {
  selectedVehicle: string;
  onSelectVehicle: (type: string) => void;
}

const vehicleTypes = [
  {
    type: 'ambulance',
    label: 'Ambulance',
    icon: Ambulance,
    color: 'hsl(var(--emergency-red))',
  },
  {
    type: 'fire_truck',
    label: 'Fire Truck',
    icon: Flame,
    color: 'hsl(var(--emergency-orange))',
  },
  {
    type: 'police',
    label: 'Police',
    icon: Shield,
    color: 'hsl(var(--emergency-blue))',
  },
];

export function VehicleSelector({ selectedVehicle, onSelectVehicle }: VehicleSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {vehicleTypes.map(({ type, label, icon: Icon, color }) => (
        <Card
          key={type}
          className={cn(
            "p-6 cursor-pointer transition-all duration-300 hover:scale-105",
            "border-2 hover:shadow-lg",
            selectedVehicle === type
              ? "border-current shadow-emergency"
              : "border-border hover:border-current"
          )}
          style={{
            color: selectedVehicle === type ? color : undefined,
            boxShadow: selectedVehicle === type ? `0 10px 40px -10px ${color}40` : undefined,
          }}
          onClick={() => onSelectVehicle(type)}
        >
          <div className="flex flex-col items-center gap-3">
            <Icon
              className={cn(
                "w-12 h-12 transition-transform",
                selectedVehicle === type && "scale-110"
              )}
              style={{ color }}
            />
            <h3 className="text-lg font-semibold">{label}</h3>
          </div>
        </Card>
      ))}
    </div>
  );
}
