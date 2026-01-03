import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettingsScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const ProfileSettingsScreen = ({ onBack, currentUserId }: ProfileSettingsScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    avatar_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [currentUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .single();

    if (data) {
      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
      })
      .eq("id", currentUserId);

    if (error) {
      toast({ title: "Error saving profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      onBack();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUserId);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: "Avatar updated!" });
    } catch (error) {
      toast({ title: "Error uploading avatar", variant: "destructive" });
    }
    setLoading(false);
  };

  if (loading && !profile.username) {
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
        <h2 className="text-xl font-bold">Profile Settings</h2>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl">
              {profile.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer">
            <Camera className="w-4 h-4 text-primary-foreground" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Tap to change photo</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={profile.username}
            onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="Enter username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={profile.full_name}
            onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={profile.bio}
            onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell us about yourself"
            rows={4}
          />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default ProfileSettingsScreen;
