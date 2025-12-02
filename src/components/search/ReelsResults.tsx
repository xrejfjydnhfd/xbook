import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

interface ReelsResultsProps {
  reels: any[];
  loading: boolean;
}

const ReelsResults = ({ reels, loading }: ReelsResultsProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No reels found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {reels.map((reel: any) => (
        <div
          key={reel.id}
          className="aspect-[9/16] relative rounded-md overflow-hidden cursor-pointer group"
          onClick={() => navigate("/videos")}
        >
          <video
            src={reel.media_url}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
              <Eye className="h-3 w-3" />
              <span>Views</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReelsResults;