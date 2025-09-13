import { File } from "@google-cloud/storage";
import { Response, Request } from "express";
import { objectStorageClient } from "../objectStorage";

// Try to import sharp, but handle gracefully if not available
let sharp: any = null;
try {
  sharp = require("sharp");
} catch (error) {
  console.warn("Sharp not available, image optimization will be limited:", error.message);
}

interface ImageOptimizationOptions {
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  quality?: number;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedParams: {
    width?: number;
    height?: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
}

interface CacheHeaders {
  etag: string;
  lastModified: string;
  cacheControl: string;
}

/**
 * Service for optimizing and serving images with advanced caching and format conversion
 */
export class ImageOptimizationService {
  private static readonly DEFAULT_CACHE_TTL = 86400; // 24 hours
  private static readonly MAX_CACHE_TTL = 31536000; // 1 year
  private static readonly WEBP_QUALITY = 85;
  private static readonly JPEG_QUALITY = 90;
  
  // Security limits to prevent resource exhaustion
  private static readonly MIN_DIMENSION = 1;
  private static readonly MAX_DIMENSION = 2000;
  private static readonly MIN_QUALITY = 40;
  private static readonly MAX_QUALITY = 95;
  private static readonly ALLOWED_FORMATS = ['webp', 'jpeg', 'png'] as const;
  private static readonly ALLOWED_FIT_VALUES = ['cover', 'contain', 'fill', 'inside', 'outside'] as const;

  /**
   * Validates and sanitizes image optimization parameters to prevent attacks
   */
  private static validateParameters(
    query: any, 
    options: ImageOptimizationOptions,
    acceptHeader: string = '',
    originalFormat?: string
  ): ValidationResult {
    const errors: string[] = [];
    
    // Parse and validate width
    let width: number | undefined;
    if (query.w || options.width) {
      const w = parseInt(query.w as string) || options.width;
      if (isNaN(w) || w < this.MIN_DIMENSION || w > this.MAX_DIMENSION) {
        errors.push(`Invalid width: must be between ${this.MIN_DIMENSION}-${this.MAX_DIMENSION}`);
      } else {
        width = w;
      }
    }
    
    // Parse and validate height
    let height: number | undefined;
    if (query.h || options.height) {
      const h = parseInt(query.h as string) || options.height;
      if (isNaN(h) || h < this.MIN_DIMENSION || h > this.MAX_DIMENSION) {
        errors.push(`Invalid height: must be between ${this.MIN_DIMENSION}-${this.MAX_DIMENSION}`);
      } else {
        height = h;
      }
    }
    
    // Parse and validate quality
    const q = parseInt(query.q as string) || options.quality;
    let quality: number;
    if (q && (isNaN(q) || q < this.MIN_QUALITY || q > this.MAX_QUALITY)) {
      errors.push(`Invalid quality: must be between ${this.MIN_QUALITY}-${this.MAX_QUALITY}`);
      quality = this.WEBP_QUALITY; // Default fallback
    } else {
      quality = q || this.WEBP_QUALITY;
    }
    
    // Validate format
    const targetFormat = this.getBestFormat(acceptHeader, originalFormat, options.format || query.f);
    if (!this.ALLOWED_FORMATS.includes(targetFormat)) {
      errors.push(`Invalid format: must be one of ${this.ALLOWED_FORMATS.join(', ')}`);
    }
    
    // Validate fit parameter
    const fit = (query.fit as any) || options.fit || 'cover';
    if (!this.ALLOWED_FIT_VALUES.includes(fit)) {
      errors.push(`Invalid fit value: must be one of ${this.ALLOWED_FIT_VALUES.join(', ')}`);
    }
    
    // Check for potential DoS via extreme aspect ratios
    if (width && height) {
      const aspectRatio = width / height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        errors.push('Invalid aspect ratio: width/height ratio must be between 0.1 and 10');
      }
    }
    
    return {
      isValid: errors.length === 0,
      error: errors.join('; '),
      sanitizedParams: {
        width,
        height,
        quality,
        format: targetFormat,
        fit
      }
    };
  }
  
  /**
   * Determines the best image format based on browser support and original format
   */
  private static getBestFormat(
    acceptHeader: string = '', 
    originalFormat?: string,
    requestedFormat?: string
  ): 'webp' | 'jpeg' | 'png' {
    // Honor explicit format request if valid
    if (requestedFormat && this.ALLOWED_FORMATS.includes(requestedFormat as any)) {
      return requestedFormat as 'webp' | 'jpeg' | 'png';
    }
    
    // Check if browser supports WebP
    const supportsWebP = acceptHeader.includes('image/webp');
    
    if (supportsWebP) {
      return 'webp';
    }
    
    // Fallback to original format or JPEG
    if (originalFormat === 'image/png') {
      return 'png';
    }
    
    return 'jpeg';
  }

  /**
   * Generates optimized cache headers
   */
  private static generateCacheHeaders(file: File, metadata: any): CacheHeaders {
    // Generate ETag based on file metadata
    const etag = `"${metadata.etag || metadata.md5Hash || 'unknown'}"`;
    
    // Use file's updated time or current time
    const lastModified = metadata.updated || metadata.timeCreated || new Date().toISOString();
    
    // Set aggressive caching for images
    const cacheControl = `public, max-age=${this.DEFAULT_CACHE_TTL}, s-maxage=${this.MAX_CACHE_TTL}, stale-while-revalidate=${this.DEFAULT_CACHE_TTL}`;
    
    return {
      etag,
      lastModified,
      cacheControl
    };
  }

  /**
   * Checks if the client's cached version is still valid
   */
  private static isClientCacheValid(req: Request, cacheHeaders: CacheHeaders): boolean {
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    // Check ETag
    if (ifNoneMatch && ifNoneMatch === cacheHeaders.etag) {
      return true;
    }
    
    // Check Last-Modified
    if (ifModifiedSince && cacheHeaders.lastModified) {
      const clientDate = new Date(ifModifiedSince);
      const fileDate = new Date(cacheHeaders.lastModified);
      
      if (clientDate >= fileDate) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Optimizes and serves an image with advanced caching and format conversion
   */
  static async serveOptimizedImage(
    file: File,
    req: Request,
    res: Response,
    options: ImageOptimizationOptions = {}
  ): Promise<void> {
    try {
      // Get file metadata for caching
      const [metadata] = await file.getMetadata();
      const cacheHeaders = this.generateCacheHeaders(file, metadata);
      
      // Check if client cache is valid
      if (this.isClientCacheValid(req, cacheHeaders)) {
        res.status(304).end();
        return;
      }
      
      // Validate and sanitize parameters to prevent security issues
      const validation = this.validateParameters(
        req.query,
        options,
        req.headers.accept || '',
        metadata.contentType
      );
      
      if (!validation.isValid) {
        res.status(400).json({ 
          error: 'Invalid image parameters', 
          details: validation.error 
        });
        return;
      }
      
      const { width, height, quality, format: targetFormat, fit } = validation.sanitizedParams;
      
      // Determine if optimization is needed and possible
      const needsOptimization = sharp && (
        targetFormat !== metadata.contentType?.split('/')[1] || 
        width || height || quality !== 100
      );
      
      // Set response headers
      const contentType = needsOptimization ? `image/${targetFormat}` : (metadata.contentType || 'image/jpeg');
      res.set({
        'Content-Type': contentType,
        'Cache-Control': cacheHeaders.cacheControl,
        'ETag': cacheHeaders.etag,
        'Last-Modified': new Date(cacheHeaders.lastModified).toUTCString(),
        'Vary': 'Accept, Accept-Encoding, User-Agent',
        'X-Image-Optimized': needsOptimization ? 'true' : 'false',
        'X-Image-Format': needsOptimization ? targetFormat : metadata.contentType?.split('/')[1] || 'jpeg',
        'X-Image-Quality': quality.toString(),
        'X-Image-Width': width?.toString() || 'original',
        'X-Image-Height': height?.toString() || 'original',
        'X-Sharp-Available': sharp ? 'true' : 'false',
      });
      
      // If no optimization needed or Sharp not available, stream original file
      if (!needsOptimization) {
        const stream = file.createReadStream();
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).send('Error streaming image');
          }
        });
        stream.pipe(res);
        return;
      }
      
      // Optimize image with Sharp (only if available)
      const transformer = sharp();
      
      // Apply transformations
      if (width || height) {
        transformer.resize(width, height, { 
          fit,
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        });
      }
      
      // Apply format and quality
      switch (targetFormat) {
        case 'webp':
          transformer.webp({ quality, effort: 6 });
          break;
        case 'jpeg':
          transformer.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          transformer.png({ quality, compressionLevel: 9 });
          break;
      }
      
      // Stream original file through transformer
      const originalStream = file.createReadStream();
      const transformedStream = originalStream.pipe(transformer);
      
      // Handle errors
      originalStream.on('error', (err) => {
        console.error('Original stream error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error reading image');
        }
      });
      
      transformedStream.on('error', (err) => {
        console.error('Transform stream error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error processing image');
        }
      });
      
      // Pipe to response
      transformedStream.pipe(res);
      
      // Log optimization for monitoring (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Image optimized: ${file.name} -> ${targetFormat}/${quality}% ${width ? `${width}x${height}` : 'original'}`);
      }
      
      // Log security-relevant events in production
      if (process.env.NODE_ENV === 'production' && (width || height)) {
        console.info('Image resize requested', {
          filename: file.name.split('/').pop(),
          dimensions: `${width || 'auto'}x${height || 'auto'}`,
          format: targetFormat,
          quality,
          userAgent: req.headers['user-agent']?.slice(0, 100)
        });
      }
      
    } catch (error) {
      console.error('Error in image optimization:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing image');
      }
    }
  }

  /**
   * Preloads and caches frequently accessed images
   */
  static async warmImageCache(imageUrls: string[]): Promise<void> {
    const warmPromises = imageUrls.map(async (url) => {
      try {
        // This would typically involve pre-generating optimized versions
        // For now, we'll just verify the images exist
        console.debug(`Warming cache for image: ${url}`);
        
        // In a full implementation, we might:
        // 1. Pre-generate WebP versions
        // 2. Pre-generate common sizes (thumbnails, etc.)
        // 3. Store in Redis or similar cache
        
      } catch (error) {
        console.warn(`Failed to warm cache for ${url}:`, error);
      }
    });
    
    await Promise.allSettled(warmPromises);
  }

  /**
   * Generates performance metrics for image loading
   */
  static generateImageMetrics(req: Request, res: Response): void {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const size = res.get('Content-Length');
      const format = res.get('X-Image-Format');
      const optimized = res.get('X-Image-Optimized') === 'true';
      
      // Log metrics (in production, this would go to monitoring service)
      console.debug('Image serving metrics:', {
        url: req.path,
        duration: `${duration}ms`,
        size: size ? `${size} bytes` : 'unknown',
        format,
        optimized,
        statusCode: res.statusCode,
        cached: res.statusCode === 304
      });
      
      // Record custom performance marks
      if (typeof performance !== 'undefined') {
        try {
          performance.mark(`image-serve-${req.path.slice(-20)}`);
        } catch (e) {
          // Silently handle performance API errors
        }
      }
    });
  }
}