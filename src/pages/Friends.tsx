import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreVertical, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Friends = () => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchAllUsers();
      fetchFriends();
      fetchPendingRequests();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId);

    if (data) {
      setAllUsers(data);
    }
  };

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        *,
        friend:friend_id (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("user_id", currentUserId)
      .eq("status", "accepted");

    if (data) {
      setFriends(data);
    }
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        *,
        sender:user_id (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("friend_id", currentUserId)
      .eq("status", "pending");

    if (data) {
      setPendingRequests(data);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: currentUserId,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: friendId,
        from_user_id: currentUserId,
        type: "friend_request",
      });

      toast({
        title: "Friend request sent!",
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    try {
      await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId);

      // Create reverse friendship
      await supabase.from("friendships").insert({
        user_id: currentUserId,
        friend_id: senderId,
        status: "accepted",
      });

      fetchFriends();
      fetchPendingRequests();

      toast({
        title: "Friend request accepted!",
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await supabase.from("friendships").delete().eq("id", requestId);

      fetchPendingRequests();

      toast({
        title: "Friend request rejected",
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Friends
        </h1>

        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4">
            {allUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.full_name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(user.id)}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            {friends.map((friendship) => (
              <Card key={friendship.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => navigate(`/profile/${friendship.friend.id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={friendship.friend.avatar_url || ""} />
                      <AvatarFallback>{friendship.friend.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{friendship.friend.full_name || friendship.friend.username}</p>
                      <p className="text-sm text-muted-foreground">@{friendship.friend.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/chat/${friendship.friend.id}`)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={request.sender.avatar_url || ""} />
                      <AvatarFallback>{request.sender.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{request.sender.full_name || request.sender.username}</p>
                      <p className="text-sm text-muted-foreground">@{request.sender.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptFriendRequest(request.id, request.sender.id)}
                      className="bg-gradient-to-r from-primary to-accent"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectFriendRequest(request.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Friends;