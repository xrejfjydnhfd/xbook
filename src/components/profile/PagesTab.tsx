import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreatePageDialog from "./pages/CreatePageDialog";

interface PagesTabProps {
  currentUserId: string;
}

const PagesTab = ({ currentUserId }: PagesTabProps) => {
  const [pages, setPages] = useState<any[]>([]);
  const [followedPages, setFollowedPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePage, setShowCreatePage] = useState(false);

  useEffect(() => {
    fetchPages();
    fetchFollowedPages();
  }, [currentUserId]);

  const fetchPages = async () => {
    const { data } = await supabase
      .from("pages")
      .select("*")
      .eq("created_by", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      setPages(data);
    }
    setLoading(false);
  };

  const fetchFollowedPages = async () => {
    const { data } = await supabase
      .from("page_followers")
      .select(`
        *,
        pages:page_id (*)
      `)
      .eq("user_id", currentUserId);

    if (data) {
      setFollowedPages(data);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Your Pages</h3>
        <Button size="sm" onClick={() => setShowCreatePage(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Page
        </Button>
      </div>

      {pages.length === 0 && followedPages.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pages yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create a page to connect with your audience
          </p>
          <Button className="mt-4" onClick={() => setShowCreatePage(true)}>
            Create Your First Page
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Card key={page.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={page.profile_image} />
                  <AvatarFallback>{page.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold">{page.name}</h4>
                  <p className="text-sm text-muted-foreground">{page.category}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Users className="w-3 h-3" />
                    <span>{page.follower_count || 0} followers</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </Card>
          ))}

          {followedPages.length > 0 && (
            <>
              <h3 className="font-semibold mt-6 mb-3">Pages You Follow</h3>
              {followedPages.map((follow) => (
                <Card key={follow.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={follow.pages?.profile_image} />
                      <AvatarFallback>{follow.pages?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">{follow.pages?.name}</h4>
                      <p className="text-sm text-muted-foreground">{follow.pages?.category}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Users className="w-3 h-3" />
                        <span>{follow.pages?.follower_count || 0} followers</span>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Following
                    </Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      <CreatePageDialog
        open={showCreatePage}
        onOpenChange={setShowCreatePage}
        currentUserId={currentUserId}
        onPageCreated={fetchPages}
      />
    </div>
  );
};

export default PagesTab;
