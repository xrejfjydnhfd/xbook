import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Clock, 
  TrendingUp, 
  Users,
  Globe,
  BarChart3,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface VideoAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchTime: number;
  totalWatchTime: number;
  reachCount: number;
  engagementRate: number;
  topCountries: { country: string; percentage: number }[];
  ageGroups: { age: string; percentage: number }[];
  genderSplit: { gender: string; percentage: number }[];
  hourlyViews: { hour: number; views: number }[];
  retentionData: { second: number; retention: number }[];
}

const VideoAnalytics = ({ open, onOpenChange, postId }: VideoAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    avgWatchTime: 0,
    totalWatchTime: 0,
    reachCount: 0,
    engagementRate: 0,
    topCountries: [
      { country: "India", percentage: 45 },
      { country: "United States", percentage: 25 },
      { country: "United Kingdom", percentage: 12 },
      { country: "Canada", percentage: 8 },
      { country: "Australia", percentage: 10 },
    ],
    ageGroups: [
      { age: "13-17", percentage: 15 },
      { age: "18-24", percentage: 35 },
      { age: "25-34", percentage: 28 },
      { age: "35-44", percentage: 14 },
      { age: "45+", percentage: 8 },
    ],
    genderSplit: [
      { gender: "Male", percentage: 52 },
      { gender: "Female", percentage: 45 },
      { gender: "Other", percentage: 3 },
    ],
    hourlyViews: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      views: Math.floor(Math.random() * 1000),
    })),
    retentionData: Array.from({ length: 10 }, (_, i) => ({
      second: i * 10,
      retention: Math.max(20, 100 - i * 8 + Math.random() * 5),
    })),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && postId) {
      fetchAnalytics();
    }
  }, [open, postId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch likes count
      const { count: likesCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Fetch watch history for views
      const { count: viewsCount } = await supabase
        .from("watch_history")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Simulate other analytics data
      const views = viewsCount || Math.floor(Math.random() * 10000) + 1000;
      const likes = likesCount || 0;
      const comments = commentsCount || 0;
      const shares = Math.floor(Math.random() * 500);
      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

      setAnalytics(prev => ({
        ...prev,
        views,
        likes,
        comments,
        shares,
        avgWatchTime: Math.floor(Math.random() * 45) + 15,
        totalWatchTime: views * (Math.floor(Math.random() * 45) + 15),
        reachCount: Math.floor(views * 1.5),
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      }));
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const StatCard = ({ icon: Icon, label, value, subValue }: {
    icon: any;
    label: string;
    value: string | number;
    subValue?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {subValue && (
              <p className="text-xs text-green-500">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProgressBar = ({ label, percentage, color = "bg-primary" }: {
    label: string;
    percentage: number;
    color?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="border-b pb-3">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Video Analytics
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-60px)] py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Eye}
                    label="Total Views"
                    value={formatNumber(analytics.views)}
                    subValue="+12% from last week"
                  />
                  <StatCard
                    icon={Heart}
                    label="Likes"
                    value={formatNumber(analytics.likes)}
                  />
                  <StatCard
                    icon={MessageCircle}
                    label="Comments"
                    value={formatNumber(analytics.comments)}
                  />
                  <StatCard
                    icon={Share2}
                    label="Shares"
                    value={formatNumber(analytics.shares)}
                  />
                </div>

                {/* Watch time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Watch Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-2xl font-bold">{formatTime(analytics.avgWatchTime)}</p>
                        <p className="text-xs text-muted-foreground">Avg. watch time</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatNumber(analytics.totalWatchTime / 60)}m</p>
                        <p className="text-xs text-muted-foreground">Total watch time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audience retention */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Audience Retention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-20">
                      {analytics.retentionData.map((point, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/80 rounded-t"
                          style={{ height: `${point.retention}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0:00</span>
                      <span>End</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                {/* Reach */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatNumber(analytics.reachCount)}</p>
                        <p className="text-xs text-muted-foreground">Accounts Reached</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Countries */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Top Countries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.topCountries.map((country, i) => (
                      <ProgressBar
                        key={i}
                        label={country.country}
                        percentage={country.percentage}
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* Age Groups */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.ageGroups.map((group, i) => (
                      <ProgressBar
                        key={i}
                        label={group.age}
                        percentage={group.percentage}
                        color="bg-blue-500"
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* Gender Split */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Gender</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      {analytics.genderSplit.map((g, i) => (
                        <div key={i} className="flex-1 text-center">
                          <div className="h-24 bg-muted rounded-lg flex items-end justify-center pb-2">
                            <div
                              className={`w-8 rounded-t ${
                                g.gender === "Male" ? "bg-blue-500" :
                                g.gender === "Female" ? "bg-pink-500" : "bg-purple-500"
                              }`}
                              style={{ height: `${g.percentage}%` }}
                            />
                          </div>
                          <p className="text-sm mt-1">{g.gender}</p>
                          <p className="text-xs text-muted-foreground">{g.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-4">
                {/* Engagement Rate */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.engagementRate}%</p>
                        <p className="text-xs text-muted-foreground">Engagement Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly activity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Views by Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-0.5 h-24">
                      {analytics.hourlyViews.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors"
                          style={{ height: `${(h.views / 1000) * 100}%` }}
                          title={`${h.hour}:00 - ${h.views} views`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>12 AM</span>
                      <span>12 PM</span>
                      <span>11 PM</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Interaction breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Interactions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Likes</span>
                      </div>
                      <span className="font-medium">{formatNumber(analytics.likes)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Comments</span>
                      </div>
                      <span className="font-medium">{formatNumber(analytics.comments)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Shares</span>
                      </div>
                      <span className="font-medium">{formatNumber(analytics.shares)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default VideoAnalytics;
