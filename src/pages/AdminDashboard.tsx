import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  FileText,
  MessageSquare,
  UserPlus,
  Bell,
  Video,
  Image,
  Activity,
  LogOut,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalFriendRequests: number;
  totalMessages: number;
  totalNotifications: number;
  totalVideos: number;
  totalImages: number;
  activeUsersToday: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalLikes: 0,
    totalFriendRequests: 0,
    totalMessages: 0,
    totalNotifications: 0,
    totalVideos: 0,
    totalImages: 0,
    activeUsersToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/addmin");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: postsCount },
        { count: commentsCount },
        { count: likesCount },
        { count: friendRequestsCount },
        { count: messagesCount },
        { count: notificationsCount },
        { count: videosCount },
        { count: imagesCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("friendships").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "video"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "image"),
      ]);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const { count: activeCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", oneDayAgo.toISOString());

      setStats({
        totalUsers: usersCount || 0,
        totalPosts: postsCount || 0,
        totalComments: commentsCount || 0,
        totalLikes: likesCount || 0,
        totalFriendRequests: friendRequestsCount || 0,
        totalMessages: messagesCount || 0,
        totalNotifications: notificationsCount || 0,
        totalVideos: videosCount || 0,
        totalImages: imagesCount || 0,
        activeUsersToday: activeCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/addmin");
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Active Users (24h)", value: stats.activeUsersToday, icon: Activity, color: "text-green-500" },
    { title: "Total Posts", value: stats.totalPosts, icon: FileText, color: "text-purple-500" },
    { title: "Videos", value: stats.totalVideos, icon: Video, color: "text-red-500" },
    { title: "Images", value: stats.totalImages, icon: Image, color: "text-pink-500" },
    { title: "Comments", value: stats.totalComments, icon: MessageSquare, color: "text-orange-500" },
    { title: "Likes", value: stats.totalLikes, icon: Activity, color: "text-rose-500" },
    { title: "Friend Requests", value: stats.totalFriendRequests, icon: UserPlus, color: "text-indigo-500" },
    { title: "Messages", value: stats.totalMessages, icon: MessageSquare, color: "text-cyan-500" },
    { title: "Notifications", value: stats.totalNotifications, icon: Bell, color: "text-yellow-500" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">LinkrVerse Management Panel</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20" disabled>
                <Users className="w-5 h-5 mr-2" />
                Manage Users
              </Button>
              <Button variant="outline" className="h-20" disabled>
                <FileText className="w-5 h-5 mr-2" />
                Manage Posts
              </Button>
              <Button variant="outline" className="h-20" disabled>
                <Bell className="w-5 h-5 mr-2" />
                Send Notifications
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
