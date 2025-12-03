import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Mail, MessageCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareGroupDialogProps {
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareGroupDialog = ({ group, open, onOpenChange }: ShareGroupDialogProps) => {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const groupLink = group ? `${window.location.origin}/group/${group.id}` : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(groupLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!" });
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=Join my group "${group?.name}" on our app: ${groupLink}`, "_blank");
  };

  const handleShareStory = () => {
    toast({ title: "Story sharing coming soon!" });
  };

  const handleInviteByEmail = () => {
    if (!email.trim()) return;
    // In a real app, this would send an email
    toast({ title: `Invitation sent to ${email}` });
    setEmail("");
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="font-semibold">{group.name}</p>
            <p className="text-sm text-muted-foreground">{group.member_count || 0} members</p>
          </div>

          <Tabs defaultValue="share">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="share">Share</TabsTrigger>
              <TabsTrigger value="story">Story</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-3 mt-4">
              <div className="flex gap-2">
                <Input value={groupLink} readOnly className="flex-1" />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                Share on WhatsApp
              </Button>
            </TabsContent>

            <TabsContent value="story" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Share this group to your story so your friends can join
              </p>
              <Button onClick={handleShareStory} className="w-full">
                Share to Your Story
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleInviteByEmail} disabled={!email.trim()} className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareGroupDialog;
