import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchNotifications();
      markAsRead();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select(`
        *,
        from_user:from_user_id (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      setNotifications(data);
    }
  };

  const markAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-primary" />;
      case "follow":
      case "friend_request":
        return <UserPlus className="w-5 h-5 text-accent" />;
      case "post":
        return <ImageIcon className="w-5 h-5 text-primary" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  const getNotificationText = (notification: any) => {
    const userName = notification.from_user.full_name || notification.from_user.username;
    
    switch (notification.type) {
      case "like":
        return `${userName} liked your post`;
      case "comment":
        return `${userName} commented on your post`;
      case "follow":
        return `${userName} started following you`;
      case "friend_request":
        return `${userName} sent you a friend request`;
      case "post":
        return `${userName} shared a new post`;
      default:
        return `New notification from ${userName}`;
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Notifications
        </h1>

        {notifications.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No notifications yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (notification.post_id) {
                    navigate(`/`);
                  } else if (notification.type === "follow" || notification.type === "friend_request") {
                    navigate(`/profile/${notification.from_user.id}`);
                  }
                }}
              >
                <CardContent className="flex items-center space-x-4 p-4">
                  <Avatar>
                    <AvatarImage src={notification.from_user.avatar_url || ""} />
                    <AvatarFallback>
                      {notification.from_user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{getNotificationText(notification)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getNotificationIcon(notification.type)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;