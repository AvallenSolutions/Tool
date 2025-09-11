import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineEditableTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  templateId: number;
  maxLength?: number;
  showLastModified?: boolean;
  lastModifiedDate?: string;
}

export function InlineEditableTitle({
  title,
  onSave,
  isLoading = false,
  className = "font-semibold text-lg text-gray-900",
  templateId,
  maxLength = 200,
  showLastModified = false,
  lastModifiedDate
}: InlineEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update editValue when title prop changes (after successful save)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(title);
      // Clear optimistic title when prop updates (successful save)
      if (optimisticTitle && title === optimisticTitle) {
        setOptimisticTitle(null);
      }
    }
  }, [title, isEditing, optimisticTitle]);

  // Clear validation error when editing starts
  useEffect(() => {
    if (isEditing) {
      setValidationError(null);
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const validateTitle = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return "Title cannot be empty or contain only whitespace";
    }
    if (trimmed.length < 3) {
      return "Title must be at least 3 characters long";
    }
    if (trimmed.length > maxLength) {
      return `Title must be ${maxLength} characters or less`;
    }
    return null;
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    // Validate the title
    const error = validateTitle(editValue);
    if (error) {
      setValidationError(error);
      return;
    }

    // Don't save if unchanged
    if (trimmedValue === title.trim()) {
      handleCancel();
      return;
    }

    try {
      setIsSaving(true);
      setValidationError(null);
      
      // Optimistic update - show new title immediately
      setOptimisticTitle(trimmedValue);
      setIsEditing(false);
      
      await onSave(trimmedValue);
      
      // Success - optimistic title will be cleared by useEffect when prop updates
    } catch (error) {
      console.error("Failed to save title:", error);
      
      // Revert optimistic update and show error
      setOptimisticTitle(null);
      setIsEditing(true);
      setValidationError("Failed to save title. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    const hasValidationError = validationError !== null;
    const isValidInput = validateTitle(editValue) === null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2" data-testid={`edit-title-${templateId}`}>
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              // Clear validation error on input change
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={`text-lg font-semibold flex-1 transition-all duration-200 ${
              hasValidationError 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                : 'focus:border-blue-500 focus:ring-blue-500'
            }`}
            maxLength={maxLength}
            disabled={isSaving}
            data-testid={`input-title-${templateId}`}
            placeholder="Enter report title..."
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !isValidInput}
            className={`px-2 transition-all duration-200 ${
              isValidInput && !isSaving
                ? 'border-green-500 hover:bg-green-50'
                : 'opacity-50'
            }`}
            data-testid={`save-title-${templateId}`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-green-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-2 transition-all duration-200 border-gray-300 hover:bg-gray-50"
            data-testid={`cancel-title-${templateId}`}
          >
            <X className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
        
        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center space-x-2 text-sm text-red-600 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4" />
            <span>{validationError}</span>
          </div>
        )}
        
        {/* Character count */}
        <div className="text-xs text-gray-500 text-right">
          {editValue.length}/{maxLength} characters
        </div>
      </div>
    );
  }

  const displayTitle = optimisticTitle || title;
  
  return (
    <div className="group flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <h3 
          className={`${className} transition-all duration-200 ${
            optimisticTitle ? 'text-blue-600' : ''
          }`}
          data-testid={`title-display-${templateId}`}
        >
          {displayTitle}
        </h3>
        {isSaving && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStartEdit}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 h-auto hover:bg-gray-100 focus:opacity-100 focus:bg-gray-100"
        disabled={isLoading || isSaving}
        data-testid={`edit-button-${templateId}`}
        aria-label={`Edit title: ${displayTitle}`}
      >
        <Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
      </Button>
    </div>
  );
}