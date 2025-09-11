import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineEditableTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  templateId: number;
  maxLength?: number;
}

export function InlineEditableTitle({
  title,
  onSave,
  isLoading = false,
  className = "font-semibold text-lg text-gray-900",
  templateId,
  maxLength = 100
}: InlineEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
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
    }
  }, [title, isEditing]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (editValue.trim() === title.trim() || editValue.trim() === "") {
      handleCancel();
      return;
    }

    try {
      setIsSaving(true);
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Failed to save title:", error);
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
    return (
      <div className="flex items-center space-x-2" data-testid={`edit-title-${templateId}`}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="text-lg font-semibold flex-1"
          maxLength={maxLength}
          disabled={isSaving}
          data-testid={`input-title-${templateId}`}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || editValue.trim() === ""}
          className="px-2"
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
          className="px-2"
        >
          <X className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center space-x-2">
      <h3 className={className}>
        {title}
      </h3>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStartEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 h-auto"
        disabled={isLoading}
        data-testid={`edit-button-${templateId}`}
      >
        <Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
      </Button>
    </div>
  );
}