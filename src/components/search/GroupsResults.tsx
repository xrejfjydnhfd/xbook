import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface GroupsResultsProps {
  groups: any[];
  loading: boolean;
}

const GroupsResults = ({ groups, loading }: GroupsResultsProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No groups found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {groups.map((group: any) => (
        <Card key={group.id} className="p-4 hover:bg-accent cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {group.cover_image ? (
                <img
                  src={group.cover_image}
                  alt={group.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Users className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {group.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs text-muted-foreground">
                  {group.member_count} members
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.is_public ? "Public" : "Private"}
                </p>
              </div>
            </div>
            <Button size="sm">Join</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GroupsResults;