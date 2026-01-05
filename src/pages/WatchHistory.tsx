import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  Play, 
  Trash2, 
  MoreVertical,
  Calendar,
  Filter,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns";

interface WatchHistoryItem {
  id: string;
  post_id: string;
  watched_at: string;
  post: {
    id: string;
    content: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    video_duration: number | null;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      full_name: string | null;
    };
  };
  progress?: number; // Saved progress percentage
}

interface GroupedHistory {
  today: WatchHistoryItem[];
  yesterday: WatchHistoryItem[];
  thisWeek: WatchHistoryItem[];
  thisMonth: WatchHistoryItem[];
  older: WatchHistoryItem[];
}

const WatchHistory = () => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchWatchHistory();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchWatchHistory = async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("watch_history")
        .select(`
          id,
          post_id,
          watched_at,
          post:posts (
            id,
            content,
            media_url,
            thumbnail_url,
            video_duration,
            profiles (
              id,
              username,
              avatar_url,
              full_name
            )
          )
        `)
        .eq("user_id", currentUserId)
        .order("watched_at", { ascending: false });

      if (error) throw error;

      // Get saved progress from localStorage
      const historyWithProgress = (data || []).map((item: any) => {
        const savedProgress = localStorage.getItem(`video_progress_${item.post_id}`);
        return {
          ...item,
          progress: savedProgress ? JSON.parse(savedProgress).percentage : 0,
        };
      });

      setHistory(historyWithProgress);
    } catch (error) {
      console.error("Error fetching watch history:", error);
      toast({
        title: "Error",
        description: "Failed to load watch history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupHistory = useCallback((items: WatchHistoryItem[]): GroupedHistory => {
    const groups: GroupedHistory = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    items.forEach((item) => {
      const date = parseISO(item.watched_at);
      
      if (isToday(date)) {
        groups.today.push(item);
      } else if (isYesterday(date)) {
        groups.yesterday.push(item);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(item);
      } else if (isThisMonth(date)) {
        groups.thisMonth.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, []);

  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.post?.content?.toLowerCase().includes(query) ||
      item.post?.profiles?.username?.toLowerCase().includes(query) ||
      item.post?.profiles?.full_name?.toLowerCase().includes(query)
    );
  });

  const groupedHistory = groupHistory(filteredHistory);

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setHistory((prev) => prev.filter((item) => item.id !== itemId));
      toast({
        title: "Removed from history",
        description: "Video removed from your watch history",
      });
    } catch (error) {
      console.error("Error deleting history item:", error);
      toast({
        title: "Error",
        description: "Failed to remove from history",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleClearAll = async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("user_id", currentUserId);

      if (error) throw error;

      setHistory([]);
      toast({
        title: "History cleared",
        description: "Your watch history has been cleared",
      });
    } catch (error) {
      console.error("Error clearing history:", error);
      toast({
        title: "Error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    }
    setClearAllDialogOpen(false);
  };

  const handleWatchVideo = (postId: string) => {
    navigate(`/videos?v=${postId}`);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatWatchedAt = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    return format(date, "MMM d, h:mm a");
  };

  const renderHistorySection = (title: string, items: WatchHistoryItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-4">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleWatchVideo(item.post_id)}
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-muted">
                {item.post?.thumbnail_url || item.post?.media_url ? (
                  <img
                    src={item.post.thumbnail_url || item.post.media_url || ""}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Duration */}
                {item.post?.video_duration && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(item.post.video_duration)}
                  </div>
                )}

                {/* Progress bar */}
                {item.progress && item.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0">
                    <Progress value={item.progress} className="h-1 rounded-none" />
                  </div>
                )}

                {/* Resume indicator */}
                {item.progress && item.progress > 5 && item.progress < 95 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="bg-white/90 rounded-full p-2">
                      <Play className="w-4 h-4 text-black fill-black" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2 mb-1">
                  {item.post?.content || "Untitled video"}
                </p>
                
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={item.post?.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-[8px]">
                      {item.post?.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {item.post?.profiles?.full_name || item.post?.profiles?.username}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatWatchedAt(item.watched_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from history
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Watch History</h1>
          {history.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setClearAllDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search watch history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-4">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Clock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No watch history yet</h3>
            <p className="text-muted-foreground text-center px-4">
              Videos you watch will appear here
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/videos")}
            >
              <Play className="w-4 h-4 mr-2" />
              Browse Videos
            </Button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground text-center px-4">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="pt-4">
            {renderHistorySection("Today", groupedHistory.today)}
            {renderHistorySection("Yesterday", groupedHistory.yesterday)}
            {renderHistorySection("This Week", groupedHistory.thisWeek)}
            {renderHistorySection("This Month", groupedHistory.thisMonth)}
            {renderHistorySection("Older", groupedHistory.older)}
          </div>
        )}
      </div>

      {/* Delete single item dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from history?</AlertDialogTitle>
            <AlertDialogDescription>
              This video will be removed from your watch history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDeleteItem(itemToDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all watch history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your entire watch history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WatchHistory;
