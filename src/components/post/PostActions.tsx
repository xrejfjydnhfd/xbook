import { Button } from "@/components/ui/button";
import { MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReactionsBar from "./ReactionsBar";

interface PostActionsProps {
  postId: string;
  userId: string;
  postOwnerId: string;
  commentCount: number;
  isSaved: boolean;
  onCommentClick: () => void;
  onShareClick: () => void;
  onSaveClick: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onReportClick?: () => void;
}

const PostActions = ({
  postId,
  userId,
  postOwnerId,
  commentCount,
  isSaved,
  onCommentClick,
  onShareClick,
  onSaveClick,
  onEditClick,
  onDeleteClick,
  onReportClick,
}: PostActionsProps) => {
  const isOwner = userId === postOwnerId;

  return (
    <div className="flex items-center justify-between pt-2 border-t">
      <div className="flex items-center gap-1">
        <ReactionsBar postId={postId} userId={userId} />
        
        <Button variant="ghost" size="sm" onClick={onCommentClick}>
          <MessageCircle className="w-4 h-4 mr-1" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onShareClick}>
          <Share2 className="w-4 h-4 mr-1" />
          Share
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSaveClick}
          className={isSaved ? "text-primary" : ""}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner ? (
              <>
                <DropdownMenuItem onClick={onEditClick}>
                  Edit post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeleteClick} className="text-destructive">
                  Delete post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onSaveClick}>
                  {isSaved ? "Unsave post" : "Save post"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReportClick}>
                  Report post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default PostActions;
