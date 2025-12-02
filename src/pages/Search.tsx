import { useState, useEffect } from "react";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AllResults from "@/components/search/AllResults";
import ReelsResults from "@/components/search/ReelsResults";
import PostsResults from "@/components/search/PostsResults";
import GroupsResults from "@/components/search/GroupsResults";
import PagesResults from "@/components/search/PagesResults";
import EventsResults from "@/components/search/EventsResults";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>({
    users: [],
    reels: [],
    posts: [],
    groups: [],
    pages: [],
    events: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setResults({
        users: [],
        reels: [],
        posts: [],
        groups: [],
        pages: [],
        events: [],
      });
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const query = searchQuery.toLowerCase().trim();

      // Search users
      const { data: users } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      // Search reels (videos only)
      const { data: reels } = await supabase
        .from("posts")
        .select("*, profiles(id, username, avatar_url)")
        .eq("media_type", "video")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      // Search posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles(id, username, avatar_url, full_name)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      // Search groups
      const { data: groups } = await supabase
        .from("groups")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      // Search pages
      const { data: pages } = await supabase
        .from("pages")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      // Search events
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(10);

      setResults({
        users: users || [],
        reels: reels || [],
        posts: posts || [],
        groups: groups || [],
        pages: pages || [],
        events: events || [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users, reels, groups, pages…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-background">
          <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            All
          </TabsTrigger>
          <TabsTrigger value="reels" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Reels
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Posts
          </TabsTrigger>
          <TabsTrigger value="groups" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Groups
          </TabsTrigger>
          <TabsTrigger value="pages" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Pages
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <AllResults results={results} loading={loading} />
        </TabsContent>

        <TabsContent value="reels" className="mt-0">
          <ReelsResults reels={results.reels} loading={loading} />
        </TabsContent>

        <TabsContent value="posts" className="mt-0">
          <PostsResults posts={results.posts} loading={loading} />
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          <GroupsResults groups={results.groups} loading={loading} />
        </TabsContent>

        <TabsContent value="pages" className="mt-0">
          <PagesResults pages={results.pages} loading={loading} />
        </TabsContent>

        <TabsContent value="events" className="mt-0">
          <EventsResults events={results.events} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Search;