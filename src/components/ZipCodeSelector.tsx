import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface ZipCode {
  id: string;
  code: string;
  name: string;
  ambulance_count: number;
  fire_truck_count: number;
  police_count: number;
}

interface ZipCodeSelectorProps {
  zipCodes: ZipCode[];
  selectedZipCode: string;
  onSelectZipCode: (code: string) => void;
}

export function ZipCodeSelector({ zipCodes, selectedZipCode, onSelectZipCode }: ZipCodeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Select Emergency Location
      </label>
      <Select value={selectedZipCode} onValueChange={onSelectZipCode}>
        <SelectTrigger className="w-full h-12 text-base">
          <SelectValue placeholder="Choose a zip code..." />
        </SelectTrigger>
        <SelectContent>
          {zipCodes.map((zip) => (
            <SelectItem key={zip.id} value={zip.code} className="cursor-pointer">
              <div className="flex justify-between items-center gap-4 w-full">
                <span className="font-semibold">{zip.code}</span>
                <span className="text-muted-foreground">{zip.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
