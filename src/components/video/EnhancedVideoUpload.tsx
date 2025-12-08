import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  X, 
  MapPin, 
  Smile, 
  UserPlus, 
  Globe, 
  Users, 
  Lock,
  ChevronDown,
  Upload,
  Film,
  Sparkles
} from 'lucide-react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import VideoUploadProgress from './VideoUploadProgress';
import FeelingSelector from '@/components/post/FeelingSelector';
import LocationInput from '@/components/post/LocationInput';
import TagFriendsDialog from '@/components/post/TagFriendsDialog';
import PrivacySelector from '@/components/post/PrivacySelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedVideoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: { username: string; avatar_url: string | null; full_name: string | null } | null;
  onPostCreated: () => void;
}

const EnhancedVideoUpload = ({ 
  open, 
  onOpenChange, 
  userId, 
  userProfile, 
  onPostCreated 
}: EnhancedVideoUploadProps) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');
  const [taggedFriends, setTaggedFriends] = useState<{ id: string; username: string }[]>([]);
  const [quality, setQuality] = useState<'auto' | 'hd' | 'sd'>('auto');
  
  const [showFeelings, setShowFeelings] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showTagFriends, setShowTagFriends] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    uploadVideo,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    progress,
    status,
    videoMetadata,
    getStatusMessage,
    formatSpeed,
    formatTimeRemaining,
    isUploading,
    isComplete,
  } = useVideoUpload(userId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('video/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a video file',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 500MB)
    if (selectedFile.size > 500 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 500MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Generate preview thumbnail
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.currentTime = 1;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!file) {
      toast({
        title: 'No video selected',
        description: 'Please select a video to upload',
        variant: 'destructive',
      });
      return;
    }

    const result = await uploadVideo(file, { quality });

    if (result) {
      // Create post in database
      const { data: postData, error: postError } = await supabase.from('posts').insert({
        user_id: userId,
        content: content.trim() || null,
        media_url: result.url,
        media_type: 'video',
        feeling,
        location,
        privacy,
        is_reel: result.metadata.isReel,
        video_duration: result.metadata.duration,
        thumbnail_url: result.metadata.thumbnail,
        processing_status: 'completed',
      }).select().single();

      if (postError) {
        toast({
          title: 'Error',
          description: 'Failed to create post',
          variant: 'destructive',
        });
        return;
      }

      // Save tagged friends
      if (taggedFriends.length > 0 && postData) {
        for (const friend of taggedFriends) {
          await supabase.from('post_tags').insert({
            post_id: postData.id,
            tagged_user_id: friend.id,
          });

          await supabase.from('notifications').insert({
            user_id: friend.id,
            from_user_id: userId,
            type: 'tag',
            post_id: postData.id,
          });
        }
      }

      toast({ title: 'Video posted successfully!' });
      
      // Reset form
      setContent('');
      setFile(null);
      setPreview(null);
      setFeeling('');
      setLocation('');
      setPrivacy('public');
      setTaggedFriends([]);
      
      onPostCreated();
      onOpenChange(false);
    }
  };

  const getPrivacyIcon = () => {
    switch (privacy) {
      case 'public': return <Globe className="w-4 h-4" />;
      case 'friends': return <Users className="w-4 h-4" />;
      case 'only_me': return <Lock className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center border-b pb-3 flex items-center justify-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Upload Video
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={userProfile?.avatar_url || ''} />
                <AvatarFallback>{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {userProfile?.full_name || userProfile?.username}
                  {feeling && <span className="font-normal text-muted-foreground"> is {feeling}</span>}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowPrivacy(true)}
                >
                  {getPrivacyIcon()}
                  <span className="ml-1 capitalize">{privacy.replace('_', ' ')}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Caption input */}
            <Textarea
              placeholder="Write a caption..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] border-0 resize-none focus-visible:ring-0 p-0"
            />

            {/* Video upload area */}
            {!file ? (
              <div 
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => videoInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  ref={videoInputRef}
                  onChange={handleFileSelect}
                />
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Click to upload video</p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP4, MOV, or WebM • Max 500MB
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-muted">
                {preview && (
                  <img 
                    src={preview} 
                    alt="Video preview" 
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                    onClick={removeFile}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
                  {file.name}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {status !== 'idle' && status !== 'complete' && (
              <VideoUploadProgress
                progress={progress}
                status={status}
                thumbnail={preview || undefined}
                onPause={pauseUpload}
                onResume={resumeUpload}
                onCancel={cancelUpload}
                formatSpeed={formatSpeed}
                formatTimeRemaining={formatTimeRemaining}
              />
            )}

            {/* Quality selector */}
            {file && !isUploading && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Upload Quality:</span>
                <div className="flex gap-2 ml-auto">
                  {(['auto', 'hd', 'sd'] as const).map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant={quality === q ? 'default' : 'outline'}
                      className="h-7 px-3 text-xs uppercase"
                      onClick={() => setQuality(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to post options */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add to your video</span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-blue-500 hover:bg-blue-500/10"
                    onClick={() => setShowTagFriends(true)}
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => setShowFeelings(true)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-orange-500 hover:bg-orange-500/10"
                    onClick={() => setShowLocation(true)}
                  >
                    <MapPin className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Post button */}
            <Button
              onClick={handlePost}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? getStatusMessage() : 'Post Video'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FeelingSelector 
        open={showFeelings} 
        onOpenChange={setShowFeelings}
        onSelect={(f) => { setFeeling(f); setShowFeelings(false); }}
      />
      
      <LocationInput
        open={showLocation}
        onOpenChange={setShowLocation}
        onSelect={(l) => { setLocation(l); setShowLocation(false); }}
      />

      <TagFriendsDialog
        open={showTagFriends}
        onOpenChange={setShowTagFriends}
        userId={userId}
        selectedFriends={taggedFriends}
        onSelect={setTaggedFriends}
      />

      <PrivacySelector
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        selected={privacy}
        onSelect={(p) => { setPrivacy(p); setShowPrivacy(false); }}
      />
    </>
  );
};

export default EnhancedVideoUpload;
