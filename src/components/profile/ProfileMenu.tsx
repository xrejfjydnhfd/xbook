import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, Users, Clock, FileText } from "lucide-react";
import SavedTab from "./SavedTab";
import GroupsTab from "./GroupsTab";
import HistoryTab from "./HistoryTab";
import PagesTab from "./PagesTab";

interface ProfileMenuProps {
  currentUserId: string;
}

const ProfileMenu = ({ currentUserId }: ProfileMenuProps) => {
  const [activeTab, setActiveTab] = useState("saved");

  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Pages</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="mt-4">
          <SavedTab currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <GroupsTab currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <PagesTab currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileMenu;
