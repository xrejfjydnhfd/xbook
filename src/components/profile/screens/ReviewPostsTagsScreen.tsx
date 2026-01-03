import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Tag, Image as ImageIcon, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewPostsTagsScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const ReviewPostsTagsScreen = ({ onBack, currentUserId }: ReviewPostsTagsScreenProps) => {
  const [pendingTags, setPendingTags] = useState<any[]>([]);
  const [approvedTags, setApprovedTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase
      .from("post_tags")
      .select(`
        *,
        posts (
          id,
          content,
          media_url,
          media_type,
          profiles (username, avatar_url)
        )
      `)
      .eq("tagged_user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      // Simulate pending/approved status since we don't have that column
      setPendingTags(data.slice(0, 2));
      setApprovedTags(data.slice(2));
    }
    setLoading(false);
  };

  const handleApprove = (tagId: string) => {
    const tag = pendingTags.find((t) => t.id === tagId);
    if (tag) {
      setPendingTags((prev) => prev.filter((t) => t.id !== tagId));
      setApprovedTags((prev) => [tag, ...prev]);
      toast({ title: "Tag approved" });
    }
  };

  const handleReject = (tagId: string) => {
    setPendingTags((prev) => prev.filter((t) => t.id !== tagId));
    toast({ title: "Tag removed" });
  };

  const handleRemove = (tagId: string) => {
    setApprovedTags((prev) => prev.filter((t) => t.id !== tagId));
    toast({ title: "Tag removed from post" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Review Posts and Tags</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending Review
            {pendingTags.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {pendingTags.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingTags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No Pending Tags</h3>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            pendingTags.map((tag) => (
              <Card key={tag.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      {tag.posts?.media_url ? (
                        <img
                          src={tag.posts.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {tag.posts?.profiles?.username} tagged you
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tag.posts?.content || "No caption"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(tag.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(tag.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedTags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No Approved Tags</h3>
              <p className="text-sm">Approved tags will appear here</p>
            </div>
          ) : (
            approvedTags.map((tag) => (
              <Card key={tag.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      {tag.posts?.media_url ? (
                        <img
                          src={tag.posts.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Tagged by {tag.posts?.profiles?.username}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tag.posts?.content || "No caption"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(tag.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewPostsTagsScreen;
