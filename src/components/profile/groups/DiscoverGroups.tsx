import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscoverGroupsProps {
  currentUserId: string;
}

const DiscoverGroups = ({ currentUserId }: DiscoverGroupsProps) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
    fetchJoinedGroups();
  }, [currentUserId]);

  const fetchGroups = async () => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("is_public", true)
      .order("member_count", { ascending: false });

    if (data) {
      setGroups(data);
    }
    setLoading(false);
  };

  const fetchJoinedGroups = async () => {
    const { data } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", currentUserId);

    if (data) {
      setJoinedGroups(data.map(m => m.group_id));
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    const { error } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: currentUserId,
        role: "member"
      });

    if (error) {
      toast({ title: "Error joining group", variant: "destructive" });
      return;
    }

    setJoinedGroups([...joinedGroups, groupId]);
    toast({ title: "Joined group!" });
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No groups found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
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
                {joinedGroups.includes(group.id) ? (
                  <Button variant="secondary" size="sm" disabled>
                    Joined
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleJoinGroup(group.id)}>
                    Join
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoverGroups;
