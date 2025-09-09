import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  ImagePlus, 
  X, 
  Eye, 
  Upload,
  CheckCircle2
} from "lucide-react";

interface SectionImageUploaderProps {
  sectionId: string;
  sectionTitle: string;
  reportId?: string;
  maxImages?: number;
}

/**
 * Component for uploading and managing images for specific report sections
 * Integrates with the guided report wizard to allow users to add supporting visuals
 */
export function SectionImageUploader({ 
  sectionId, 
  sectionTitle, 
  reportId,
  maxImages = 3 
}: SectionImageUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Get current report image data
  const { data: reportImages } = useQuery({
    queryKey: [`/api/reports/guided/${reportId}/images`],
    enabled: !!reportId,
    select: (data) => data?.uploadedImages || {}
  });

  // Get section images
  const sectionImages = reportImages?.[sectionId] || [];

  // Upload parameters mutation
  const getUploadParametersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get upload parameters');
      }
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL
      };
    }
  });

  // Save image to report mutation
  const saveImageToReportMutation = useMutation({
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!reportId) return;
      
      const response = await fetch(`/api/reports/guided/${reportId}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sectionId,
          imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save image to report');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/guided/${reportId}/images`] });
      toast({
        title: "Image Added",
        description: `Successfully added image to ${sectionTitle} section`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to add image to report",
        variant: "destructive"
      });
    }
  });

  // Remove image mutation
  const removeImageMutation = useMutation({
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!reportId) return;
      
      const response = await fetch(`/api/reports/guided/${reportId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sectionId,
          imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove image from report');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/guided/${reportId}/images`] });
      toast({
        title: "Image Removed",
        description: `Successfully removed image from ${sectionTitle} section`,
      });
    }
  });

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL;
      
      console.log('🖼️ Image uploaded successfully:', imageUrl);
      
      // Save to report
      await saveImageToReportMutation.mutateAsync({ imageUrl });
    }
  };

  const handleGetUploadParameters = async () => {
    return await getUploadParametersMutation.mutateAsync();
  };

  const handleRemoveImage = (imageUrl: string) => {
    removeImageMutation.mutate({ imageUrl });
  };

  const canUploadMore = sectionImages.length < maxImages;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ImagePlus className="w-4 h-4" />
          Section Images
          <Badge variant="secondary" className="text-xs">
            {sectionImages.length}/{maxImages}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Button */}
        {canUploadMore && (
          <div className="mb-4">
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760} // 10MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Image to {sectionTitle}
            </ObjectUploader>
          </div>
        )}

        {/* Current Images */}
        {sectionImages.length > 0 ? (
          <div className="space-y-3">
            {sectionImages.map((imageUrl: string, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={`${sectionTitle} supporting image ${index + 1}`}
                    className="w-12 h-12 object-cover rounded border"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Image {index + 1}
                  </p>
                  <p className="text-xs text-gray-500">
                    Supporting visual for {sectionTitle}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(imageUrl, '_blank')}
                    className="p-1 h-8 w-8"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveImage(imageUrl)}
                    disabled={removeImageMutation.isPending}
                    className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <ImagePlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No images added yet</p>
            <p className="text-xs mt-1">Add supporting visuals to enhance your {sectionTitle.toLowerCase()} section</p>
          </div>
        )}

        {!canUploadMore && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                Maximum images reached for this section ({maxImages}/{maxImages})
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}