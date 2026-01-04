import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Pause, 
  RotateCcw,
  Scissors,
  LayoutGrid,
  ArrowRight,
  Upload,
  X,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";

interface VideoDuetStitchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalVideoUrl: string;
  originalVideoThumbnail?: string;
  originalCreator: {
    username: string;
    avatar_url?: string;
  };
  onSubmit: (type: "duet" | "stitch", videoFile: File, caption: string) => void;
}

const VideoDuetStitch = ({
  open,
  onOpenChange,
  originalVideoUrl,
  originalVideoThumbnail,
  originalCreator,
  onSubmit,
}: VideoDuetStitchProps) => {
  const [mode, setMode] = useState<"duet" | "stitch">("duet");
  const [recordedVideo, setRecordedVideo] = useState<File | null>(null);
  const [recordedPreview, setRecordedPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const [stitchTrimEnd, setStitchTrimEnd] = useState(5);
  
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setRecordedVideo(null);
      setRecordedPreview(null);
      setCaption("");
      setIsPlaying(false);
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    setRecordedVideo(file);
    setRecordedPreview(URL.createObjectURL(file));
  };

  const togglePlayback = () => {
    if (originalVideoRef.current) {
      if (isPlaying) {
        originalVideoRef.current.pause();
        recordedVideoRef.current?.pause();
      } else {
        originalVideoRef.current.play();
        recordedVideoRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetPlayback = () => {
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = 0;
    }
    if (recordedVideoRef.current) {
      recordedVideoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSubmit = () => {
    if (!recordedVideo) {
      toast.error("Please upload your video first");
      return;
    }
    onSubmit(mode, recordedVideo, caption);
    onOpenChange(false);
  };

  const removeRecordedVideo = () => {
    setRecordedVideo(null);
    if (recordedPreview) {
      URL.revokeObjectURL(recordedPreview);
      setRecordedPreview(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create with @{originalCreator.username}'s video</DialogTitle>
          <DialogDescription>
            Create a duet or stitch response to this video
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "duet" | "stitch")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="duet" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Duet
            </TabsTrigger>
            <TabsTrigger value="stitch" className="flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Stitch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duet" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your video will appear side-by-side with the original
            </p>
            
            {/* Duet Preview */}
            <div className="grid grid-cols-2 gap-2 bg-black rounded-xl overflow-hidden aspect-[16/9]">
              {/* Original Video */}
              <div className="relative">
                <video
                  ref={originalVideoRef}
                  src={originalVideoUrl}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                />
                <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                  @{originalCreator.username}
                </div>
              </div>
              
              {/* Your Video */}
              <div className="relative bg-muted flex items-center justify-center">
                {recordedPreview ? (
                  <>
                    <video
                      ref={recordedVideoRef}
                      src={recordedPreview}
                      className="w-full h-full object-cover"
                      muted={isMuted}
                      loop
                      playsInline
                    />
                    <button
                      onClick={removeRecordedVideo}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">Upload your video</span>
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stitch" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A clip from the original will play before your video
            </p>
            
            {/* Stitch trim control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Use first {stitchTrimEnd} seconds of original
              </label>
              <input
                type="range"
                min={1}
                max={15}
                value={stitchTrimEnd}
                onChange={(e) => setStitchTrimEnd(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Stitch Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={originalVideoRef}
                    src={originalVideoUrl}
                    className="w-full h-full object-contain"
                    muted={isMuted}
                    playsInline
                  />
                  <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/30 rounded">
                    <div 
                      className="h-full bg-primary rounded"
                      style={{ width: `${(stitchTrimEnd / 15) * 100}%` }}
                    />
                  </div>
                </div>
                
                <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  {recordedPreview ? (
                    <>
                      <video
                        ref={recordedVideoRef}
                        src={recordedPreview}
                        className="w-full h-full object-contain"
                        muted={isMuted}
                        playsInline
                      />
                      <button
                        onClick={removeRecordedVideo}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Your response</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={resetPlayback}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={togglePlayback}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Caption */}
        <Textarea
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[80px]"
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={!recordedVideo}
          >
            Post {mode === "duet" ? "Duet" : "Stitch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoDuetStitch;
