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
import { ChevronRight, ChevronLeft, Search, Upload, Camera } from "lucide-react";

const CATEGORIES = [
  "Music", "Health & Fitness", "Website Development", "Technology",
  "Education", "Entertainment", "Food & Drink", "Travel", "Sports",
  "Fashion", "Art", "Business", "Photography", "Gaming", "Automotive",
  "Real Estate", "Finance", "Beauty", "Home & Garden", "Pets"
];

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onPageCreated: () => void;
}

const CreatePageDialog = ({ open, onOpenChange, currentUserId, onPageCreated }: CreatePageDialogProps) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [purpose, setPurpose] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && step === 5) {
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

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setProfileImage(file);
        setProfilePreview(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const handleCreate = async () => {
    if (!name.trim() || !category) return;

    setLoading(true);
    try {
      let imageUrl = null;

      if (profileImage) {
        const fileExt = profileImage.name.split(".").pop();
        const fileName = `page_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, profileImage);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("media")
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }

      const { data: page, error } = await supabase
        .from("pages")
        .insert({
          name: name.trim(),
          category,
          description: bio.trim(),
          profile_image: imageUrl,
          created_by: currentUserId
        })
        .select()
        .single();

      if (error) throw error;

      // Creator follows their own page
      await supabase.from("page_followers").insert({
        page_id: page.id,
        user_id: currentUserId
      });

      // Send invitations to selected friends
      if (selectedFriends.length > 0) {
        const invitations = selectedFriends.map(friendId => ({
          page_id: page.id,
          invited_by: currentUserId,
          invited_user_id: friendId
        }));

        await supabase.from("page_invitations").insert(invitations);

        // Create notifications
        const notifications = selectedFriends.map(friendId => ({
          user_id: friendId,
          from_user_id: currentUserId,
          type: "page_invite",
          post_id: null
        }));

        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "Page created successfully!" });
      onOpenChange(false);
      onPageCreated();
      resetForm();
    } catch (error) {
      toast({ title: "Error creating page", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setCategory("");
    setCategorySearch("");
    setPurpose("");
    setBio("");
    setWebsite("");
    setEmail("");
    setPhone("");
    setProfileImage(null);
    setProfilePreview(null);
    setSelectedFriends([]);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return category.length > 0;
      case 3: return purpose.length > 0;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                placeholder="Enter your page name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What category best describes your page?
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCategories.map((cat) => (
                <div
                  key={cat}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    category === cat ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What do you want to do with your page?
            </p>
            <RadioGroup value={purpose} onValueChange={setPurpose}>
              <div className={`p-4 border rounded-lg cursor-pointer ${purpose === "product" ? "border-primary" : ""}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="product" id="product" />
                  <div>
                    <Label htmlFor="product" className="font-medium">Promote a Product</Label>
                    <p className="text-sm text-muted-foreground">Sell products or services</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 border rounded-lg cursor-pointer ${purpose === "content" ? "border-primary" : ""}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="content" id="content" />
                  <div>
                    <Label htmlFor="content" className="font-medium">Create Content</Label>
                    <p className="text-sm text-muted-foreground">Share posts, videos, and updates</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 border rounded-lg cursor-pointer ${purpose === "fans" ? "border-primary" : ""}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="fans" id="fans" />
                  <div>
                    <Label htmlFor="fans" className="font-medium">Connect with Fans</Label>
                    <p className="text-sm text-muted-foreground">Build a community around your brand</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add some information about your page (optional)
            </p>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell people about your page"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a profile photo for your page
            </p>
            <div className="flex justify-center">
              <div
                onClick={handleImageUpload}
                className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              >
                {profilePreview ? (
                  <img src={profilePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">Upload Photo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite friends to follow your page
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
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Create a Page"}
            {step === 2 && "Select Category"}
            {step === 3 && "Page Purpose"}
            {step === 4 && "General Information"}
            {step === 5 && "Profile Photo"}
            {step === 6 && "Invite Friends"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${s <= step ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>

        {renderStep()}

        <div className="flex gap-2 mt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < 6 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Page"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePageDialog;
