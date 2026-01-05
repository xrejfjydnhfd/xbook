import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Sparkles,
  Palette,
  Gauge,
  Sun,
  Contrast,
  Droplets,
  Wand2,
  X,
  RotateCcw,
  Timer,
  FlipHorizontal,
  Grid3x3,
  Zap,
  Camera,
  StopCircle,
} from "lucide-react";

interface VideoEffectsFilter {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  sepia: number;
  grayscale: number;
}

interface VideoEffect {
  id: string;
  name: string;
  icon: React.ReactNode;
  filter: Partial<VideoEffectsFilter>;
}

interface VideoRecorderWithEffectsProps {
  open: boolean;
  onClose: () => void;
  onVideoReady: (videoBlob: Blob, thumbnail: string) => void;
}

const defaultFilters: VideoEffectsFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
  sepia: 0,
  grayscale: 0,
};

const presetFilters: VideoEffect[] = [
  { id: "normal", name: "Normal", icon: <Wand2 className="w-4 h-4" />, filter: {} },
  { id: "beauty", name: "Beauty", icon: <Sparkles className="w-4 h-4" />, filter: { brightness: 108, contrast: 95, saturation: 90, blur: 0.3 } },
  { id: "vivid", name: "Vivid", icon: <Palette className="w-4 h-4" />, filter: { saturation: 140, contrast: 110 } },
  { id: "warm", name: "Warm", icon: <Sun className="w-4 h-4" />, filter: { sepia: 20, saturation: 110, brightness: 105 } },
  { id: "cool", name: "Cool", icon: <Droplets className="w-4 h-4" />, filter: { hue: 180, saturation: 90, brightness: 95 } },
  { id: "vintage", name: "Vintage", icon: <Timer className="w-4 h-4" />, filter: { sepia: 40, contrast: 90, saturation: 80 } },
  { id: "bw", name: "B&W", icon: <Contrast className="w-4 h-4" />, filter: { grayscale: 100, contrast: 110 } },
  { id: "dramatic", name: "Dramatic", icon: <Zap className="w-4 h-4" />, filter: { contrast: 130, saturation: 80, brightness: 90 } },
];

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

const VideoRecorderWithEffects = ({ open, onClose, onVideoReady }: VideoRecorderWithEffectsProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<VideoEffectsFilter>(defaultFilters);
  const [activePreset, setActivePreset] = useState("normal");
  const [speed, setSpeed] = useState(1);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [beautyMode, setBeautyMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Build CSS filter string
  const getFilterStyle = useCallback(() => {
    const f = filters;
    return `
      brightness(${f.brightness}%)
      contrast(${f.contrast}%)
      saturate(${f.saturation}%)
      blur(${f.blur}px)
      hue-rotate(${f.hue}deg)
      sepia(${f.sepia}%)
      grayscale(${f.grayscale}%)
    `.trim();
  }, [filters]);

  // Apply preset filter
  const applyPreset = (preset: VideoEffect) => {
    setActivePreset(preset.id);
    const newFilters = { ...defaultFilters, ...preset.filter };
    if (beautyMode && preset.id !== "beauty") {
      newFilters.blur = Math.max(newFilters.blur, 0.3);
      newFilters.brightness = Math.max(newFilters.brightness, 105);
    }
    setFilters(newFilters);
  };

  // Toggle beauty mode
  useEffect(() => {
    if (beautyMode) {
      setFilters(prev => ({
        ...prev,
        blur: Math.max(prev.blur, 0.3),
        brightness: Math.max(prev.brightness, 105),
        contrast: Math.min(prev.contrast, 98),
      }));
    } else if (activePreset === "normal") {
      setFilters(prev => ({
        ...prev,
        blur: 0,
      }));
    }
  }, [beautyMode, activePreset]);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
    }
  }, [facingMode]);

  useEffect(() => {
    if (open) {
      initCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [open, initCamera]);

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setRecordedChunks(chunksRef.current);
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Flip camera
  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Reset recording
  const resetRecording = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRecordedChunks([]);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  // Generate thumbnail
  const generateThumbnail = (video: HTMLVideoElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    });
  };

  // Confirm and use video
  const confirmVideo = async () => {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    const tempVideo = document.createElement('video');
    tempVideo.src = URL.createObjectURL(blob);
    tempVideo.muted = true;
    
    tempVideo.onloadeddata = async () => {
      tempVideo.currentTime = 0.5;
    };
    
    tempVideo.onseeked = async () => {
      const thumbnail = await generateThumbnail(tempVideo);
      URL.revokeObjectURL(tempVideo.src);
      onVideoReady(blob, thumbnail);
      resetRecording();
      onClose();
    };
    
    tempVideo.load();
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    resetRecording();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[95vh] p-0 bg-black">
        <div className="relative h-full flex flex-col">
          {/* Close button */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 left-4 z-50 text-white bg-black/30 backdrop-blur-sm rounded-full"
            onClick={handleClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Recording timer */}
          {isRecording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 px-4 py-1.5 rounded-full flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-semibold">{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Camera preview */}
          <div className="flex-1 relative overflow-hidden bg-black">
            {previewUrl ? (
              <video
                src={previewUrl}
                className="w-full h-full object-contain"
                style={{ filter: getFilterStyle() }}
                controls
                loop
                autoPlay
                playsInline
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{
                    filter: getFilterStyle(),
                    transform: isMirrored && facingMode === "user" ? "scaleX(-1)" : "none",
                  }}
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Grid overlay */}
                {showGrid && cameraReady && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>
                )}

                {/* Loading state */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          {!previewUrl ? (
            <div className="bg-black/90 backdrop-blur-md p-4 space-y-4 max-h-[40vh] overflow-y-auto">
              {/* Effects tabs */}
              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="w-full bg-white/10 p-1">
                  <TabsTrigger value="filters" className="flex-1 text-white data-[state=active]:bg-white/20">
                    <Palette className="w-4 h-4 mr-2" />
                    Filters
                  </TabsTrigger>
                  <TabsTrigger value="effects" className="flex-1 text-white data-[state=active]:bg-white/20">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Effects
                  </TabsTrigger>
                  <TabsTrigger value="speed" className="flex-1 text-white data-[state=active]:bg-white/20">
                    <Gauge className="w-4 h-4 mr-2" />
                    Speed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="mt-3 space-y-4">
                  {/* Preset filters */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {presetFilters.map((preset) => (
                      <Button
                        key={preset.id}
                        variant={activePreset === preset.id ? "default" : "ghost"}
                        size="sm"
                        className={`flex-shrink-0 ${activePreset !== preset.id ? "text-white hover:bg-white/10" : ""}`}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.icon}
                        <span className="ml-1.5">{preset.name}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Manual adjustments */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Sun className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <Slider
                        value={[filters.brightness]}
                        min={50}
                        max={150}
                        step={1}
                        onValueChange={([v]) => setFilters(p => ({ ...p, brightness: v }))}
                        className="flex-1"
                      />
                      <span className="text-white/70 text-xs w-10 text-right">{filters.brightness}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Contrast className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <Slider
                        value={[filters.contrast]}
                        min={50}
                        max={150}
                        step={1}
                        onValueChange={([v]) => setFilters(p => ({ ...p, contrast: v }))}
                        className="flex-1"
                      />
                      <span className="text-white/70 text-xs w-10 text-right">{filters.contrast}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Droplets className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <Slider
                        value={[filters.saturation]}
                        min={0}
                        max={200}
                        step={1}
                        onValueChange={([v]) => setFilters(p => ({ ...p, saturation: v }))}
                        className="flex-1"
                      />
                      <span className="text-white/70 text-xs w-10 text-right">{filters.saturation}%</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="effects" className="mt-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="beauty"
                        checked={beautyMode}
                        onCheckedChange={setBeautyMode}
                      />
                      <Label htmlFor="beauty" className="text-white flex items-center gap-1.5 cursor-pointer">
                        <Sparkles className="w-4 h-4" /> Beauty Mode
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="mirror"
                        checked={isMirrored}
                        onCheckedChange={setIsMirrored}
                      />
                      <Label htmlFor="mirror" className="text-white flex items-center gap-1.5 cursor-pointer">
                        <FlipHorizontal className="w-4 h-4" /> Mirror
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="grid"
                        checked={showGrid}
                        onCheckedChange={setShowGrid}
                      />
                      <Label htmlFor="grid" className="text-white flex items-center gap-1.5 cursor-pointer">
                        <Grid3x3 className="w-4 h-4" /> Grid
                      </Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="speed" className="mt-3">
                  <div className="flex gap-2 justify-center flex-wrap">
                    {speedOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={speed === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSpeed(opt.value)}
                        className={speed !== opt.value ? "border-white/30 text-white hover:bg-white/10" : ""}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-center text-white/50 text-xs mt-2">
                    Speed affects playback, not recording
                  </p>
                </TabsContent>
              </Tabs>

              {/* Recording controls */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white h-12 w-12"
                  onClick={flipCamera}
                  disabled={isRecording}
                >
                  <FlipHorizontal className="w-6 h-6" />
                </Button>

                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full transition-all ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 scale-95" 
                      : "bg-white hover:bg-white/90"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!cameraReady}
                >
                  {isRecording ? (
                    <StopCircle className="w-8 h-8 text-white" />
                  ) : (
                    <Video className="w-8 h-8 text-black" />
                  )}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white h-12 w-12"
                  onClick={() => applyPreset(presetFilters[0])}
                >
                  <RotateCcw className="w-6 h-6" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-black/90 backdrop-blur-md p-4 flex gap-4">
              <Button
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
                onClick={resetRecording}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button
                className="flex-1"
                onClick={confirmVideo}
              >
                Use Video
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VideoRecorderWithEffects;
