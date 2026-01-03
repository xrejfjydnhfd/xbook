import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddHighlightsScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const AddHighlightsScreen = ({ onBack, currentUserId }: AddHighlightsScreenProps) => {
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [highlightName, setHighlightName] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      setStories(data);
    }
    setLoading(false);
  };

  const toggleStory = (storyId: string) => {
    setSelectedStories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const handleCreateHighlight = () => {
    if (!highlightName.trim()) {
      toast({ title: "Please enter a highlight name", variant: "destructive" });
      return;
    }
    if (selectedStories.size === 0) {
      toast({ title: "Please select at least one story", variant: "destructive" });
      return;
    }

    // In a real app, you'd save this to a highlights table
    toast({ title: "Highlight created!", description: `"${highlightName}" with ${selectedStories.size} stories` });
    onBack();
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
        <h2 className="text-xl font-bold">Add Highlights</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Highlight name"
            value={highlightName}
            onChange={(e) => setHighlightName(e.target.value)}
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">Select Stories</h3>
          {stories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No stories available</p>
              <p className="text-sm">Create stories first to add to highlights</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className={`aspect-[9/16] rounded-lg overflow-hidden cursor-pointer relative ${
                    selectedStories.has(story.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleStory(story.id)}
                >
                  {story.media_type === "image" ? (
                    <img
                      src={story.media_url}
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={story.media_url}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {selectedStories.has(story.id) && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleCreateHighlight}
        className="w-full"
        disabled={!highlightName.trim() || selectedStories.size === 0}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Highlight
      </Button>
    </div>
  );
};

export default AddHighlightsScreen;
