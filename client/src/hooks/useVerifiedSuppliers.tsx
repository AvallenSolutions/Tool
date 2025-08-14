import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface VerifiedSupplier {
  id: string;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: string;
  isVerified: boolean;
  website?: string;
  contactEmail?: string;
  description?: string;
  logoUrl?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  submittedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseVerifiedSuppliersOptions {
  category?: string;
  autoRefresh?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for managing verified suppliers with automatic status synchronization.
 * 
 * Features:
 * - Real-time supplier verification status updates
 * - Automatic cache invalidation when verification status changes
 * - Category-based filtering
 * - Consistent data across all product registration forms
 * 
 * @param options Configuration options for filtering and refreshing
 * @returns Query result with verified suppliers data
 */
export function useVerifiedSuppliers(options: UseVerifiedSuppliersOptions = {}) {
  const { category, autoRefresh = true, refetchInterval = 30000 } = options;
  const queryClient = useQueryClient();

  // Build query key with category filter
  const queryKey = category 
    ? ['/api/verified-suppliers', { category }]
    : ['/api/verified-suppliers'];

  const query = useQuery<VerifiedSupplier[]>({
    queryKey,
    queryFn: async () => {
      const url = category 
        ? `/api/verified-suppliers?category=${encodeURIComponent(category)}`
        : '/api/verified-suppliers';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suppliers: ${response.statusText}`);
      }
      
      return response.json();
    },
    refetchInterval: autoRefresh ? refetchInterval : false,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Auto-invalidate related queries when verification status changes
  useEffect(() => {
    if (query.data) {
      const verifiedSupplierIds = query.data
        .filter(supplier => supplier.isVerified && supplier.verificationStatus === 'verified')
        .map(supplier => supplier.id);

      // Store current verified IDs for comparison
      const currentVerifiedIds = queryClient.getQueryData<string[]>(['verified-supplier-ids']) || [];
      
      // Check if verification status has changed
      const hasStatusChanged = 
        verifiedSupplierIds.length !== currentVerifiedIds.length ||
        verifiedSupplierIds.some(id => !currentVerifiedIds.includes(id));

      if (hasStatusChanged) {
        // Update stored IDs
        queryClient.setQueryData(['verified-supplier-ids'], verifiedSupplierIds);
        
        // Invalidate all related queries to ensure sync
        queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
        
        console.log('🔄 Supplier verification status changed - invalidating caches');
      }
    }
  }, [query.data, queryClient]);

  return {
    ...query,
    // Helper functions for working with verified suppliers
    getVerifiedSuppliers: () => query.data?.filter(s => s.isVerified && s.verificationStatus === 'verified') || [],
    getSuppliersByCategory: (cat: string) => query.data?.filter(s => s.supplierCategory === cat && s.isVerified) || [],
    getSupplierById: (id: string) => query.data?.find(s => s.id === id),
    isSupplierVerified: (id: string) => {
      const supplier = query.data?.find(s => s.id === id);
      return supplier?.isVerified && supplier?.verificationStatus === 'verified';
    },
  };
}

/**
 * Hook for monitoring real-time supplier verification changes.
 * Used to trigger immediate updates when suppliers are verified/unverified.
 */
export function useSupplierVerificationSync() {
  const queryClient = useQueryClient();

  const syncVerificationStatus = (supplierId: string, newStatus: string) => {
    // Update all supplier-related caches
    queryClient.setQueriesData(
      { queryKey: ['/api/verified-suppliers'] },
      (oldData: VerifiedSupplier[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(supplier => {
          if (supplier.id === supplierId) {
            return {
              ...supplier,
              verificationStatus: newStatus,
              isVerified: newStatus === 'verified',
              updatedAt: new Date().toISOString(),
            };
          }
          return supplier;
        });
      }
    );

    // Invalidate all related queries to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    
    console.log(`🔄 Synced verification status for supplier ${supplierId}: ${newStatus}`);
  };

  return { syncVerificationStatus };
}