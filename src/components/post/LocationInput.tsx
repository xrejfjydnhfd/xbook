import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { useState } from "react";

interface LocationInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: string) => void;
}

const popularLocations = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
];

const LocationInput = ({ open, onOpenChange, onSelect }: LocationInputProps) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = popularLocations.filter(loc =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Using a simple reverse geocoding approach
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            // For now, just use coordinates as location
            onSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } catch (error) {
            console.error("Error getting location:", error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search for a location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {loading ? "Getting location..." : "Use current location"}
          </Button>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-2">Popular locations</p>
            {filtered.map((location) => (
              <Button
                key={location}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => onSelect(location)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {location}
              </Button>
            ))}
            {search && !filtered.includes(search) && (
              <Button
                variant="ghost"
                className="w-full justify-start text-primary"
                onClick={() => onSelect(search)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use "{search}"
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationInput;
