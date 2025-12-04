import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TagFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  selectedFriends: { id: string; username: string }[];
  onSelect: (friends: { id: string; username: string }[]) => void;
}

const TagFriendsDialog = ({ open, onOpenChange, userId, selectedFriends, onSelect }: TagFriendsDialogProps) => {
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<{ id: string; username: string }[]>(selectedFriends);

  useEffect(() => {
    if (open) {
      fetchFriends();
      setSelected(selectedFriends);
    }
  }, [open, userId, selectedFriends]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        friend_id,
        user_id,
        friend:profiles!friendships_friend_id_fkey(id, username, avatar_url, full_name),
        user:profiles!friendships_user_id_fkey(id, username, avatar_url, full_name)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted");

    if (data) {
      const friendsList = data.map((f: any) => 
        f.user_id === userId ? f.friend : f.user
      ).filter(Boolean);
      setFriends(friendsList);
    }
  };

  const toggleFriend = (friend: any) => {
    const isSelected = selected.some(s => s.id === friend.id);
    if (isSelected) {
      setSelected(selected.filter(s => s.id !== friend.id));
    } else {
      setSelected([...selected, { id: friend.id, username: friend.username }]);
    }
  };

  const handleDone = () => {
    onSelect(selected);
    onOpenChange(false);
  };

  const filtered = friends.filter(friend =>
    friend.username?.toLowerCase().includes(search.toLowerCase()) ||
    friend.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tag Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No friends found
              </p>
            ) : (
              filtered.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => toggleFriend(friend)}
                >
                  <Checkbox
                    checked={selected.some(s => s.id === friend.id)}
                    onCheckedChange={() => toggleFriend(friend)}
                  />
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar_url || ""} />
                    <AvatarFallback>{friend.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{friend.full_name || friend.username}</p>
                    <p className="text-xs text-muted-foreground">@{friend.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <Button onClick={handleDone} className="w-full">
            Done ({selected.length} selected)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagFriendsDialog;
