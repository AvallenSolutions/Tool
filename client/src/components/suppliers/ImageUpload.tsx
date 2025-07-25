import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ImageUploadProps {
  onImagesUploaded: (imageUrls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ImageUpload({ 
  onImagesUploaded, 
  maxImages = 5, 
  disabled = false 
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      setUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        formData.append(`images`, file);
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      try {
        const response = await apiRequest("POST", "/api/suppliers/upload-images", formData, {
          headers: {
            // Don't set Content-Type, let browser set it with boundary for FormData
          }
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        const result = await response.json();
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (result) => {
      if (result.success && result.imageUrls) {
        const newImages = [...uploadedImages, ...result.imageUrls].slice(0, maxImages);
        setUploadedImages(newImages);
        onImagesUploaded(newImages);
        setUploadProgress(0);
      }
    },
    onError: () => {
      setUploadProgress(0);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validate file types
      const validFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
      );
      
      if (validFiles.length !== files.length) {
        // Some files were invalid
        return;
      }
      
      if (uploadedImages.length + validFiles.length > maxImages) {
        // Too many images
        return;
      }

      const fileList = new DataTransfer();
      validFiles.forEach(file => fileList.items.add(file));
      
      uploadMutation.mutate(fileList.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    onImagesUploaded(newImages);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Upload Product Images
          {uploadedImages.length > 0 && (
            <Badge variant="outline">{uploadedImages.length}/{maxImages}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {uploadedImages.length < maxImages && (
          <div
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              disabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="hidden"
            />
            
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                <div className="text-sm text-gray-600">Uploading images...</div>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <div className="text-sm text-gray-600">
                  Click to upload product images
                </div>
                <div className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to 5MB each. Max {maxImages} images.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Instructions */}
        {uploadedImages.length === 0 && (
          <Alert>
            <ImageIcon className="h-4 w-4" />
            <AlertDescription>
              Upload high-quality product images. The first image will be used as the primary product image.
            </AlertDescription>
          </Alert>
        )}

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Uploaded Images:</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  
                  {index === 0 && (
                    <Badge className="absolute top-1 left-1 text-xs bg-blue-600">
                      Primary
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadedImages.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} uploaded successfully. 
              These will be saved with your product.
            </AlertDescription>
          </Alert>
        )}

        {/* Error handling */}
        {uploadMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to upload images. Please try again with smaller files (under 5MB).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}