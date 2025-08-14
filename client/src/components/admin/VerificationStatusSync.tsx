import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface VerificationStatusSyncProps {
  supplierId?: string;
  newStatus?: string;
  onStatusChange?: (supplierId: string, status: string) => void;
}

/**
 * Component for handling real-time supplier verification status synchronization.
 * Automatically invalidates relevant caches when verification status changes.
 */
export function VerificationStatusSync({ 
  supplierId, 
  newStatus, 
  onStatusChange 
}: VerificationStatusSyncProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (supplierId && newStatus) {
      // Update all relevant caches when verification status changes
      const syncVerificationStatus = async () => {
        try {
          // Update supplier data in all related queries
          queryClient.setQueriesData(
            { queryKey: ['/api/verified-suppliers'] },
            (oldData: any[] | undefined) => {
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
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] }),
          ]);

          // Clear cached verification IDs to force re-evaluation
          queryClient.removeQueries({ queryKey: ['verified-supplier-ids'] });

          // Call callback if provided
          onStatusChange?.(supplierId, newStatus);

          console.log(`🔄 Synced verification status for supplier ${supplierId}: ${newStatus}`);

          // Show success toast
          toast({
            title: "Verification Status Updated",
            description: `Supplier verification status changed to ${newStatus}. All product forms have been updated.`,
          });

        } catch (error) {
          console.error('Error syncing verification status:', error);
          toast({
            title: "Sync Error",
            description: "Failed to sync verification status across forms. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      syncVerificationStatus();
    }
  }, [supplierId, newStatus, queryClient, toast, onStatusChange]);

  // This component doesn't render anything - it's purely for side effects
  return null;
}

/**
 * Hook for triggering verification status sync manually
 */
export function useVerificationStatusSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const syncStatus = async (supplierId: string, newStatus: string) => {
    try {
      // Update all supplier-related caches
      queryClient.setQueriesData(
        { queryKey: ['/api/verified-suppliers'] },
        (oldData: any[] | undefined) => {
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

      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] }),
      ]);

      // Clear cached verification IDs
      queryClient.removeQueries({ queryKey: ['verified-supplier-ids'] });

      console.log(`🔄 Manually synced verification status for supplier ${supplierId}: ${newStatus}`);

      toast({
        title: "Status Synced",
        description: `Verification status updated across all forms.`,
      });

      return true;
    } catch (error) {
      console.error('Error syncing verification status:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync verification status. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { syncStatus };
}