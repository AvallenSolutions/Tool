import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { imagePerformanceService } from '@/services/ImagePerformanceService';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean; // For above-the-fold images
  sizes?: string; // For responsive images
  quality?: number; // Image quality (1-100)
  onLoad?: () => void;
  onError?: () => void;
  'data-testid'?: string;
}

interface ImageState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  isVisible: boolean;
}

/**
 * Optimized lazy loading image component with advanced features:
 * - Intersection Observer for lazy loading
 * - WebP format support with fallbacks
 * - Responsive image sizing
 * - Loading placeholders and skeleton states
 * - Performance monitoring
 * - Cache optimization
 */
export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  placeholder,
  fallbackIcon,
  priority = false,
  sizes,
  quality = 85,
  onLoad,
  onError,
  'data-testid': testId,
}: LazyImageProps) {
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    isLoading: false,
    hasError: false,
    isVisible: priority, // Priority images are immediately visible
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadStartTime = useRef<number>(0);

  // Generate optimized image sources with WebP support
  const getOptimizedSrc = useCallback((
    originalSrc: string, 
    format?: 'webp' | 'jpeg' | 'png', 
    customWidth?: number, 
    customHeight?: number
  ) => {
    if (!originalSrc) return '';
    
    // If already optimized URL, return as-is
    if (originalSrc.includes('?')) return originalSrc;
    
    const params = new URLSearchParams();
    if (quality && quality !== 85) params.set('q', quality.toString());
    if (customWidth || width) params.set('w', (customWidth || width!).toString());
    if (customHeight || height) params.set('h', (customHeight || height!).toString());
    if (format) params.set('f', format);
    
    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  }, [quality, width, height]);

  // Generate responsive srcSet for different screen sizes
  const generateSrcSet = useCallback((originalSrc: string, format?: 'webp' | 'jpeg') => {
    if (!width || !originalSrc) return undefined;
    
    const densityRatios = [1, 1.5, 2, 3]; // Different density ratios
    return densityRatios
      .map(ratio => {
        const scaledWidth = Math.round(width * ratio);
        const scaledHeight = height ? Math.round(height * ratio) : undefined;
        const optimizedSrc = getOptimizedSrc(originalSrc, format, scaledWidth, scaledHeight);
        return `${optimizedSrc} ${ratio}x`;
      })
      .join(', ');
  }, [width, height, getOptimizedSrc]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    const loadTime = performance.now() - loadStartTime.current;
    
    setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
    
    // Complete performance tracking
    imagePerformanceService.completeImageLoad(src, true);
    
    // Performance monitoring
    if (loadStartTime.current > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Image loaded in ${loadTime.toFixed(2)}ms:`, src);
      }
      
      // Track performance metrics
      if ('PerformanceObserver' in window) {
        try {
          // Record custom performance mark
          performance.mark(`image-load-${src.slice(-20)}`);
        } catch (e) {
          // Silently handle performance API errors
        }
      }
    }
    
    onLoad?.();
  }, [src, onLoad]);

  // Handle image load error
  const handleError = useCallback(() => {
    setState(prev => ({ ...prev, hasError: true, isLoading: false }));
    
    // Track error in performance monitoring
    imagePerformanceService.completeImageLoad(src, false, 'Image load failed');
    
    onError?.();
  }, [src, onError]);

  // Start loading image when visible
  const startLoading = useCallback(() => {
    if (state.isLoading || state.isLoaded || state.hasError) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    loadStartTime.current = performance.now();
    
    // Start performance tracking
    imagePerformanceService.startImageLoad(src, {
      isLazyLoaded: !priority,
      width,
      height,
      isOptimized: true // LazyImage always applies optimizations
    });
  }, [state, src, priority, width, height]);

  // Intersection Observer setup
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.isVisible) {
            setState(prev => ({ ...prev, isVisible: true }));
            
            // Track viewport entry for performance monitoring
            imagePerformanceService.trackImageViewportEntry(src);
            
            startLoading();
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, state.isVisible, startLoading]);

  // Priority images load immediately
  useEffect(() => {
    if (priority && !state.isLoading && !state.isLoaded && !state.hasError) {
      startLoading();
    }
  }, [priority, state, startLoading]);

  // Container dimensions for aspect ratio
  const containerStyle = width && height ? {
    aspectRatio: `${width} / ${height}`,
  } : {};

  // Loading skeleton/placeholder
  if (!state.isVisible && !priority) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'bg-gray-200 animate-pulse flex items-center justify-center',
          'transition-colors duration-200',
          className
        )}
        style={containerStyle}
        data-testid={testId ? `${testId}-skeleton` : undefined}
      >
        {fallbackIcon && (
          <div className="text-gray-400">
            {fallbackIcon}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (state.hasError) {
    return (
      <div
        className={cn(
          'bg-gray-100 flex items-center justify-center',
          'border border-gray-200 text-gray-400',
          className
        )}
        style={containerStyle}
        data-testid={testId ? `${testId}-error` : undefined}
      >
        {fallbackIcon || (
          <div className="text-sm text-center p-2">
            Failed to load image
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (state.isVisible && state.isLoading && !state.isLoaded) {
    return (
      <div
        className={cn(
          'bg-gray-200 animate-pulse flex items-center justify-center',
          'transition-opacity duration-300',
          className
        )}
        style={containerStyle}
        data-testid={testId ? `${testId}-loading` : undefined}
      >
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Loaded image
  return (
    <picture className={cn('block', className)} data-testid={testId}>
      {/* WebP source for modern browsers */}
      <source
        srcSet={generateSrcSet(src, 'webp')}
        sizes={sizes || (width ? `${width}px` : '100vw')}
        type="image/webp"
      />
      
      {/* Fallback JPEG/PNG source */}
      <source
        srcSet={generateSrcSet(src, 'jpeg')}
        sizes={sizes || (width ? `${width}px` : '100vw')}
        type="image/jpeg"
      />
      
      {/* Main image element */}
      <img
        ref={imgRef}
        src={getOptimizedSrc(src)}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          state.isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={containerStyle}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        data-testid={testId ? `${testId}-image` : undefined}
      />
    </picture>
  );
}

// Specialized components for common use cases
export function ProductImage({
  src,
  alt,
  className,
  priority = false,
  ...props
}: Omit<LazyImageProps, 'fallbackIcon'>) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn('rounded-lg object-cover', className)}
      fallbackIcon={
        <div className="flex flex-col items-center text-gray-400">
          <svg className="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">No Image</span>
        </div>
      }
      priority={priority}
      {...props}
    />
  );
}

export function SupplierLogoImage({
  src,
  alt,
  className,
  ...props
}: Omit<LazyImageProps, 'fallbackIcon'>) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn('rounded-lg object-contain bg-white', className)}
      fallbackIcon={
        <div className="flex flex-col items-center text-gray-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </div>
      }
      {...props}
    />
  );
}