import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search, Image as ImageIcon, Video, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchProfileScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const SearchProfileScreen = ({ onBack, currentUserId }: SearchProfileScreenProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", currentUserId)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false });

    if (data) {
      setResults(data);
    }
    setLoading(false);
  };

  const getPostIcon = (post: any) => {
    if (post.media_type === "video") {
      return <Video className="w-4 h-4" />;
    } else if (post.media_url) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Search Profile</h2>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : searched ? (
        results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-1">No Results Found</h3>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            {results.map((post) => (
              <Card key={post.id}>
                <CardContent className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {post.media_url ? (
                      post.media_type === "video" ? (
                        <video
                          src={post.media_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={post.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getPostIcon(post)}
                      <span className="text-xs text-muted-foreground capitalize">
                        {post.media_type || "Text"} Post
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {post.content || "No caption"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-1">Search Your Profile</h3>
          <p className="text-sm">Find posts, photos, and videos</p>
        </div>
      )}
    </div>
  );
};

export default SearchProfileScreen;
