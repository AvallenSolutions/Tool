import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (imagePath: string) => void;
  buttonClassName?: string;
  children?: ReactNode;
  currentImageUrl?: string;
  placeholder?: string;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * image management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - Image selection
 *   - Image preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 */
export function ImageUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onComplete,
  buttonClassName,
  children,
  currentImageUrl,
  placeholder = "Upload Image",
}: ImageUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          try {
            const response = await apiRequest('/api/admin/upload-image', {
              method: 'POST',
            }) as { uploadURL: string };
            return {
              method: 'PUT' as const,
              url: response.uploadURL,
            };
          } catch (error) {
            console.error('Error getting upload parameters:', error);
            throw error;
          }
        },
      })
      .on('upload', () => {
        setIsUploading(true);
      })
      .on('complete', async (result) => {
        try {
          setIsUploading(false);
          if (result.successful && result.successful.length > 0) {
            const uploadedFile = result.successful[0];
            const uploadURL = (uploadedFile as any).uploadURL;
            
            // Notify backend that upload is complete and get normalized path
            const response = await apiRequest('/api/admin/images', {
              method: 'PUT',
              body: JSON.stringify({ imageURL: uploadURL }),
              headers: {
                'Content-Type': 'application/json',
              },
            }) as { objectPath: string };

            onComplete?.(response.objectPath);
            setShowModal(false);
            uppy.clear();
          }
        } catch (error) {
          console.error('Error completing upload:', error);
          setIsUploading(false);
        }
      })
      .on('error', () => {
        setIsUploading(false);
      })
  );

  return (
    <div className="flex flex-col items-start gap-2">
      {currentImageUrl && (
        <div className="w-32 h-32 border rounded-lg overflow-hidden">
          <img 
            src={currentImageUrl} 
            alt="Current" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        disabled={isUploading}
        variant="outline"
        size="sm"
      >
        {isUploading ? (
          <>
            <Upload className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4 mr-2" />
            {children || placeholder}
          </>
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note="Images only, up to 10MB"
      />
    </div>
  );
}