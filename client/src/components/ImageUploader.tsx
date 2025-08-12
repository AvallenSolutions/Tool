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
  onUpload?: (urls: string[]) => void;
  onComplete?: (imagePath: string) => void;
  maxImages?: number;
  existingImages?: string[];
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
  onUpload,
  onComplete,
  maxImages = 1,
  existingImages = [],
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
            const response = await fetch('/api/objects/upload', {
              method: 'POST',
              credentials: 'include',
            });
            const data = await response.json() as { uploadURL: string };
            return {
              method: 'PUT' as const,
              url: data.uploadURL,
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
        setIsUploading(false);
        setShowModal(false);
        
        if (result.successful && result.successful.length > 0) {
          const uploadURLs = result.successful.map(file => (file as any).uploadURL);
          
          if (onUpload) {
            onUpload(uploadURLs);
          }
          
          if (onComplete && uploadURLs.length > 0) {
            try {
              const response = await fetch('/api/admin/images', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ imageURL: uploadURLs[0] }),
              });
              if (response.ok) {
                const data = await response.json() as { objectPath: string };
                onComplete(data.objectPath);
              } else {
                // Fallback for development - use uploaded URL directly
                console.log('Using uploaded URL directly for development');
                onComplete(uploadURLs[0]);
              }
            } catch (error) {
              console.error('Error updating image:', error);
              // Fallback for development - use uploaded URL directly
              console.log('Using uploaded URL directly for development');
              onComplete(uploadURLs[0]);
            }
          }
        }
      })
      .on('error', () => {
        setIsUploading(false);
      })
  );

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Display existing images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {existingImages.map((url, index) => (
            <div key={index} className="w-24 h-24 border rounded-lg overflow-hidden">
              <img 
                src={url} 
                alt={`Uploaded ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
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