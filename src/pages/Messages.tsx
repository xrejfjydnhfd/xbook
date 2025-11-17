import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Messages = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (data) {
      const uniqueUsers = new Map();
      data.forEach((msg: any) => {
        const otherUser = msg.sender_id === currentUserId ? msg.receiver : msg.sender;
        if (!uniqueUsers.has(otherUser.id)) {
          uniqueUsers.set(otherUser.id, {
            ...otherUser,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            isRead: msg.is_read || msg.sender_id === currentUserId
          });
        }
      });
      setConversations(Array.from(uniqueUsers.values()));
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Messages
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredConversations.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No conversations yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conv.avatar_url || ""} />
                    <AvatarFallback>{conv.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{conv.full_name || conv.username}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {!conv.isRead && (
                    <div className="w-3 h-3 bg-primary rounded-full" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
