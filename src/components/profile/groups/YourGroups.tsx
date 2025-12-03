import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock, Globe, Share2 } from "lucide-react";
import ShareGroupDialog from "./ShareGroupDialog";

interface YourGroupsProps {
  currentUserId: string;
}

const YourGroups = ({ currentUserId }: YourGroupsProps) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareGroup, setShareGroup] = useState<any>(null);

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  const fetchGroups = async () => {
    const { data: memberships } = await supabase
      .from("group_members")
      .select(`
        *,
        groups:group_id (*)
      `)
      .eq("user_id", currentUserId);

    if (memberships) {
      setGroups(memberships.map(m => m.groups).filter(Boolean));
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (groups.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">You haven't joined any groups</p>
        <p className="text-sm text-muted-foreground mt-2">
          Discover groups to join
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14">
                <AvatarImage src={group.cover_image} />
                <AvatarFallback className="bg-primary/10">
                  {group.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{group.name}</h4>
                  {group.is_public ? (
                    <Globe className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {group.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Users className="w-3 h-3" />
                  <span>{group.member_count || 0} members</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShareGroup(group)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ShareGroupDialog
        group={shareGroup}
        open={!!shareGroup}
        onOpenChange={(open) => !open && setShareGroup(null)}
      />
    </>
  );
};

export default YourGroups;
