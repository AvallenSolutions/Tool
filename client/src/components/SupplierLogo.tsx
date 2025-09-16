import { Building2 } from 'lucide-react';

interface SupplierLogoProps {
  logoUrl?: string | null;
  supplierName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SupplierLogo({ logoUrl, supplierName, size = 'md', className = '' }: SupplierLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200`}>
        <img
          src={logoUrl}
          alt={`${supplierName} logo`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // If image fails to load, hide it and show fallback
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextSibling) {
              (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
        {/* Fallback icon (hidden by default, shown if image fails) */}
        <div 
          className={`absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400`}
          style={{ display: 'none' }}
        >
          <Building2 className={iconSizeClasses[size]} />
        </div>
      </div>
    );
  }

  // No logo provided - show fallback icon
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-50 text-gray-400 rounded-lg border border-gray-200`}>
      <Building2 className={iconSizeClasses[size]} />
    </div>
  );
}