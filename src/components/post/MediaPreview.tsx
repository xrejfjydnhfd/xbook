import { Button } from "@/components/ui/button";
import { X, Video, GripVertical } from "lucide-react";
import { useState } from "react";

interface MediaPreviewProps {
  previews: string[];
  files: File[];
  onRemove: (index: number) => void;
}

const MediaPreview = ({ previews, files, onRemove }: MediaPreviewProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const getGridClass = () => {
    if (previews.length === 1) return "grid-cols-1";
    if (previews.length === 2) return "grid-cols-2";
    if (previews.length === 3) return "grid-cols-2";
    return "grid-cols-2";
  };

  return (
    <div className="relative border rounded-lg p-2">
      <div className={`grid ${getGridClass()} gap-2`}>
        {previews.map((preview, index) => (
          <div
            key={index}
            className={`relative group rounded-lg overflow-hidden ${
              previews.length === 3 && index === 0 ? "col-span-2" : ""
            }`}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
          >
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-48 object-cover"
            />
            
            {files[index]?.type.startsWith("video") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Video className="w-12 h-12 text-white" />
              </div>
            )}

            {/* Drag handle */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded p-1 cursor-grab">
                <GripVertical className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Remove button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* File info */}
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded px-2 py-1">
                <p className="text-xs text-white truncate">
                  {files[index]?.name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previews.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {previews.length} file{previews.length > 1 ? "s" : ""} selected • Drag to reorder
        </p>
      )}
    </div>
  );
};

export default MediaPreview;
