import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export const AdminFriendRequests = () => {
  const [friendships, setFriendships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriendships();
  }, []);

  const fetchFriendships = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(id, username, full_name, avatar_url),
          friend:profiles!friendships_friend_id_fkey(id, username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFriendships(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pending = friendships.filter((f) => f.status === "pending");
  const accepted = friendships.filter((f) => f.status === "accepted");
  const rejected = friendships.filter((f) => f.status === "rejected");

  if (loading) {
    return <div className="text-center py-8">Loading friend requests...</div>;
  }

  const FriendshipCard = ({ friendship }: { friendship: any }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={friendship.user?.avatar_url || ""} />
          <AvatarFallback>{friendship.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{friendship.user?.full_name || friendship.user?.username}</p>
          <p className="text-sm text-muted-foreground">sent request to</p>
        </div>
        <Avatar>
          <AvatarImage src={friendship.friend?.avatar_url || ""} />
          <AvatarFallback>{friendship.friend?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{friendship.friend?.full_name || friendship.friend?.username}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(friendship.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Badge variant={
        friendship.status === "accepted" ? "default" :
        friendship.status === "pending" ? "secondary" :
        "destructive"
      }>
        {friendship.status}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Friend Requests</h1>
        <p className="text-muted-foreground">Monitor all friend requests</p>
      </div>

      <div className="flex gap-4">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {pending.length} Pending
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          {accepted.length} Accepted
        </Badge>
        <Badge variant="destructive" className="text-lg px-4 py-2">
          {rejected.length} Rejected
        </Badge>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {pending.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                pending.map((friendship) => (
                  <FriendshipCard key={friendship.id} friendship={friendship} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {accepted.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No accepted requests</p>
              ) : (
                accepted.map((friendship) => (
                  <FriendshipCard key={friendship.id} friendship={friendship} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {rejected.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No rejected requests</p>
              ) : (
                rejected.map((friendship) => (
                  <FriendshipCard key={friendship.id} friendship={friendship} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
