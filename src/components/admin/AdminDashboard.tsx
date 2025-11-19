import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileImage, UserPlus, Bell, Eye, Video } from "lucide-react";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    totalPosts: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalFriendRequests: 0,
    pendingRequests: 0,
    totalNotifications: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total Users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active Users (logged in last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", yesterday);

      // Total Posts
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // Photos
      const { count: totalPhotos } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("media_type", "image");

      // Videos
      const { count: totalVideos } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("media_type", "video");

      // Friend Requests
      const { count: totalFriendRequests } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true });

      const { count: pendingRequests } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Notifications
      const { count: totalNotifications } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        onlineUsers: 0, // Placeholder
        totalPosts: totalPosts || 0,
        totalPhotos: totalPhotos || 0,
        totalVideos: totalVideos || 0,
        totalFriendRequests: totalFriendRequests || 0,
        pendingRequests: pendingRequests || 0,
        totalNotifications: totalNotifications || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Active Users (24h)",
      value: stats.activeUsers,
      icon: Eye,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Total Posts",
      value: stats.totalPosts,
      icon: FileImage,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Photos",
      value: stats.totalPhotos,
      icon: FileImage,
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
    {
      title: "Videos",
      value: stats.totalVideos,
      icon: Video,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Friend Requests",
      value: stats.totalFriendRequests,
      icon: UserPlus,
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: UserPlus,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
    },
    {
      title: "Notifications",
      value: stats.totalNotifications,
      icon: Bell,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the admin dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Activity chart will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );
};
