import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface EventsResultsProps {
  events: any[];
  loading: boolean;
}

const EventsResults = ({ events, loading }: EventsResultsProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {events.map((event: any) => (
        <Card key={event.id} className="overflow-hidden hover:bg-accent cursor-pointer">
          {event.banner_image && (
            <img
              src={event.banner_image}
              alt={event.title}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.event_date), "PPP 'at' p")}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  {event.interested_count} interested · {event.going_count} going
                </span>
              </div>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
                {event.description}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1">
                Interested
              </Button>
              <Button size="sm" className="flex-1">
                Going
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default EventsResults;