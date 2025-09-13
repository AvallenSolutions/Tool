import { Building2 } from 'lucide-react';
import { SupplierLogoImage } from '@/components/ui/lazy-image';

interface SupplierLogoProps {
  logoUrl?: string | null;
  supplierName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean; // For above-the-fold supplier logos
}

export function SupplierLogo({ logoUrl, supplierName, size = 'md', className = '', priority = false }: SupplierLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const pixelSizes = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
  };

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200`}>
        <SupplierLogoImage
          src={logoUrl}
          alt={`${supplierName} logo`}
          className="w-full h-full"
          width={pixelSizes[size].width}
          height={pixelSizes[size].height}
          priority={priority}
          quality={90} // High quality for logos
          data-testid={`supplier-logo-${supplierName.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    );
  }

  // No logo provided - show fallback icon
  return (
    <div 
      className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-50 text-gray-400 rounded-lg border border-gray-200`}
      data-testid={`supplier-logo-fallback-${supplierName.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Building2 className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'}`} />
    </div>
  );
}