import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ForYouGroups from "./groups/ForYouGroups";
import YourGroups from "./groups/YourGroups";
import DiscoverGroups from "./groups/DiscoverGroups";
import CreateGroupDialog from "./groups/CreateGroupDialog";
import CreateGroupPost from "./groups/CreateGroupPost";

interface GroupsTabProps {
  currentUserId: string;
}

const GroupsTab = ({ currentUserId }: GroupsTabProps) => {
  const [subTab, setSubTab] = useState("foryou");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Tabs value={subTab} onValueChange={setSubTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="foryou">For You</TabsTrigger>
            <TabsTrigger value="yourgroups">Your Groups</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 ml-4">
          <Button size="icon" variant="outline" onClick={() => setShowCreatePost(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => setShowCreateGroup(true)}>
          Create Group
        </Button>
      </div>

      {subTab === "foryou" && <ForYouGroups currentUserId={currentUserId} />}
      {subTab === "yourgroups" && <YourGroups currentUserId={currentUserId} />}
      {subTab === "discover" && <DiscoverGroups currentUserId={currentUserId} />}

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUserId}
      />

      <CreateGroupPost
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default GroupsTab;
