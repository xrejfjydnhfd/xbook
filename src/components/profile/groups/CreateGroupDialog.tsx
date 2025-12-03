import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Globe, Lock, ChevronRight } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

const CreateGroupDialog = ({ open, onOpenChange, currentUserId }: CreateGroupDialogProps) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && step === 2) {
      fetchFriends();
    }
  }, [open, step]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        friend:friend_id (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("user_id", currentUserId)
      .eq("status", "accepted");

    if (data) {
      setFriends(data.map(f => f.friend).filter(Boolean));
    }
  };

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description.trim(),
          is_public: privacy === "public",
          created_by: currentUserId
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin
      await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: currentUserId,
          role: "admin"
        });

      // Send invitations to selected friends
      if (selectedFriends.length > 0) {
        const invitations = selectedFriends.map(friendId => ({
          group_id: group.id,
          invited_by: currentUserId,
          invited_user_id: friendId
        }));

        await supabase.from("group_invitations").insert(invitations);

        // Create notifications for invited friends
        const notifications = selectedFriends.map(friendId => ({
          user_id: friendId,
          from_user_id: currentUserId,
          type: "group_invite",
          post_id: null
        }));

        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "Group created successfully!" });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error creating group", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setDescription("");
    setPrivacy("public");
    setSelectedFriends([]);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Create a Group" : "Invite Friends"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="Enter group name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label>Privacy</Label>
              <RadioGroup value={privacy} onValueChange={(v: "public" | "private") => setPrivacy(v)} className="mt-2">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="public" id="public" />
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="public" className="font-medium">Public</Label>
                    <p className="text-sm text-muted-foreground">Anyone can find and join</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="private" id="private" />
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="private" className="font-medium">Private</Label>
                    <p className="text-sm text-muted-foreground">Only invited members can join</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleNext} disabled={!name.trim()} className="w-full">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select friends to invite to your group
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No friends to invite
                </p>
              ) : (
                friends.map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg cursor-pointer"
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <Checkbox checked={selectedFriends.includes(friend.id)} />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback>{friend.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{friend.full_name || friend.username}</p>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create & Invite"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
