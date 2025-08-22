import { db } from '../db';
import { sql } from 'drizzle-orm';
import { deletedConversations } from '@shared/schema';

/**
 * Clean up deleted conversations that are older than 14 days
 * This function should be run periodically (e.g., daily via cron)
 */
export async function cleanupExpiredDeletedConversations() {
  try {
    console.log('🗑️ Starting cleanup of expired deleted conversations...');
    
    // Get expired items (14+ days old)
    const expiredItems = await db
      .select()
      .from(deletedConversations)
      .where(sql`permanent_delete_at <= NOW()`);

    if (expiredItems.length === 0) {
      console.log('✅ No expired conversations found.');
      return { deleted: 0 };
    }

    console.log(`🗑️ Found ${expiredItems.length} expired conversation(s) to permanently delete.`);

    // Permanently delete expired items
    await db
      .delete(deletedConversations)
      .where(sql`permanent_delete_at <= NOW()`);

    console.log(`✅ Permanently deleted ${expiredItems.length} expired conversations`);

    return { deleted: expiredItems.length };
  } catch (error) {
    console.error('❌ Error during cleanup of expired conversations:', error);
    throw error;
  }
}

/**
 * Get statistics about deleted conversations
 */
export async function getDeletedConversationsStats() {
  try {
    const stats = await db
      .select({
        total: sql`COUNT(*)`.mapWith(Number),
        expiredCount: sql`COUNT(CASE WHEN permanent_delete_at <= NOW() THEN 1 END)`.mapWith(Number),
        avgDaysLeft: sql`AVG(EXTRACT(days FROM (permanent_delete_at - NOW())))`.mapWith(Number),
      })
      .from(deletedConversations);

    return stats[0] || { total: 0, expiredCount: 0, avgDaysLeft: 0 };
  } catch (error) {
    console.error('❌ Error getting deleted conversations stats:', error);
    throw error;
  }
}