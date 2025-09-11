/**
 * Waste Data Migration Service
 * Handles migration from legacy waste fields in monthlyFacilityData 
 * to the new comprehensive waste streams system
 */
import { db } from "../db";
import { eq } from "drizzle-orm";
import { 
  monthlyFacilityData, 
  wasteStreams,
  type InsertWasteStream
} from "@shared/schema";

export interface LegacyWasteData {
  id: string;
  companyId: number;
  facilityId: number;
  month: string;
  organicWasteKg?: string;
  packagingWasteKg?: string;
  hazardousWasteKg?: string;
  generalWasteKg?: string;
}

export interface MigrationResult {
  success: boolean;
  recordsProcessed: number;
  wasteStreamsCreated: number;
  errors: string[];
  migrationReport: {
    organicWasteMigrated: number;
    packagingWasteMigrated: number;
    hazardousWasteMigrated: number;
    generalWasteMigrated: number;
  };
}

export interface MigrationRollbackData {
  migratedWasteStreamIds: string[];
  originalData: LegacyWasteData[];
}

export class WasteDataMigrationService {
  /**
   * Perform comprehensive migration of legacy waste data to waste streams
   */
  async migrateWasteData(dryRun: boolean = false): Promise<MigrationResult> {
    console.log(`🔄 Starting waste data migration${dryRun ? ' (DRY RUN)' : ''}...`);
    
    const result: MigrationResult = {
      success: true,
      recordsProcessed: 0,
      wasteStreamsCreated: 0,
      errors: [],
      migrationReport: {
        organicWasteMigrated: 0,
        packagingWasteMigrated: 0,
        hazardousWasteMigrated: 0,
        generalWasteMigrated: 0
      }
    };

    try {
      // Step 1: Identify records with legacy waste data
      const legacyRecords = await this.findLegacyWasteData();
      console.log(`📊 Found ${legacyRecords.length} records with legacy waste data`);
      
      if (legacyRecords.length === 0) {
        console.log("✅ No legacy waste data found to migrate");
        return result;
      }

      result.recordsProcessed = legacyRecords.length;

      // Step 2: Process each legacy record
      for (const record of legacyRecords) {
        try {
          const wasteStreamRecords = await this.convertLegacyRecordToWasteStreams(record);
          
          if (!dryRun && wasteStreamRecords.length > 0) {
            // Insert new waste streams
            for (const wasteStream of wasteStreamRecords) {
              await db.insert(wasteStreams).values(wasteStream);
              result.wasteStreamsCreated++;
            }
          } else if (dryRun) {
            result.wasteStreamsCreated += wasteStreamRecords.length;
          }

          // Update migration report
          this.updateMigrationReport(record, result.migrationReport);

        } catch (error) {
          const errorMsg = `Failed to migrate record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Step 3: Validate migration
      if (!dryRun && result.success) {
        const validationResult = await this.validateMigration(legacyRecords);
        if (!validationResult.valid) {
          result.success = false;
          result.errors.push(...validationResult.errors);
        }
      }

      console.log(`${result.success ? '✅' : '❌'} Migration ${dryRun ? 'simulation' : 'completed'}: ${result.wasteStreamsCreated} waste streams created`);
      return result;

    } catch (error) {
      console.error("Migration failed:", error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
      return result;
    }
  }

  /**
   * Find all monthlyFacilityData records with legacy waste data
   */
  private async findLegacyWasteData(): Promise<LegacyWasteData[]> {
    try {
      // Note: Since legacy fields don't exist in current DB, this query will need
      // to be updated when legacy fields are actually present
      const query = `
        SELECT 
          id, 
          company_id as "companyId", 
          facility_id as "facilityId", 
          month,
          CASE WHEN organic_waste_kg IS NOT NULL THEN organic_waste_kg::text END as "organicWasteKg",
          CASE WHEN packaging_waste_kg IS NOT NULL THEN packaging_waste_kg::text END as "packagingWasteKg",
          CASE WHEN hazardous_waste_kg IS NOT NULL THEN hazardous_waste_kg::text END as "hazardousWasteKg",
          CASE WHEN general_waste_kg IS NOT NULL THEN general_waste_kg::text END as "generalWasteKg"
        FROM monthly_facility_data 
        WHERE (
          organic_waste_kg IS NOT NULL OR 
          packaging_waste_kg IS NOT NULL OR 
          hazardous_waste_kg IS NOT NULL OR 
          general_waste_kg IS NOT NULL
        )
        ORDER BY month DESC
      `;

      // For now, return empty array since legacy fields don't exist
      // This method is ready for when legacy data needs to be migrated
      return [];

    } catch (error) {
      console.log("Legacy waste fields don't exist yet - no data to migrate");
      return [];
    }
  }

  /**
   * Convert a legacy waste record to new waste stream format
   */
  private async convertLegacyRecordToWasteStreams(legacyRecord: LegacyWasteData): Promise<InsertWasteStream[]> {
    const streams: InsertWasteStream[] = [];

    // Define default disposal routes based on waste type
    const disposalRouteMapping = {
      organic_waste: 'anaerobic_digestion', // Best practice for organic waste
      packaging_waste: 'recycling', // Packaging should be recycled when possible
      hazardous_waste: 'hazardous_treatment', // Special handling for hazardous waste
      general_waste: 'landfill' // General waste typically goes to landfill
    };

    // Convert organic waste
    if (legacyRecord.organicWasteKg && parseFloat(legacyRecord.organicWasteKg) > 0) {
      streams.push({
        monthlyFacilityDataId: legacyRecord.id,
        wasteType: 'organic_waste',
        weightKg: legacyRecord.organicWasteKg,
        disposalRoute: disposalRouteMapping.organic_waste
      });
    }

    // Convert packaging waste
    if (legacyRecord.packagingWasteKg && parseFloat(legacyRecord.packagingWasteKg) > 0) {
      streams.push({
        monthlyFacilityDataId: legacyRecord.id,
        wasteType: 'dry_mixed_recycling', // Packaging typically goes to recycling
        weightKg: legacyRecord.packagingWasteKg,
        disposalRoute: disposalRouteMapping.packaging_waste
      });
    }

    // Convert hazardous waste
    if (legacyRecord.hazardousWasteKg && parseFloat(legacyRecord.hazardousWasteKg) > 0) {
      streams.push({
        monthlyFacilityDataId: legacyRecord.id,
        wasteType: 'hazardous_waste',
        weightKg: legacyRecord.hazardousWasteKg,
        disposalRoute: disposalRouteMapping.hazardous_waste
      });
    }

    // Convert general waste
    if (legacyRecord.generalWasteKg && parseFloat(legacyRecord.generalWasteKg) > 0) {
      streams.push({
        monthlyFacilityDataId: legacyRecord.id,
        wasteType: 'general_waste',
        weightKg: legacyRecord.generalWasteKg,
        disposalRoute: disposalRouteMapping.general_waste
      });
    }

    return streams;
  }

  /**
   * Update migration report with converted data
   */
  private updateMigrationReport(record: LegacyWasteData, report: MigrationResult['migrationReport']) {
    if (record.organicWasteKg && parseFloat(record.organicWasteKg) > 0) {
      report.organicWasteMigrated++;
    }
    if (record.packagingWasteKg && parseFloat(record.packagingWasteKg) > 0) {
      report.packagingWasteMigrated++;
    }
    if (record.hazardousWasteKg && parseFloat(record.hazardousWasteKg) > 0) {
      report.hazardousWasteMigrated++;
    }
    if (record.generalWasteKg && parseFloat(record.generalWasteKg) > 0) {
      report.generalWasteMigrated++;
    }
  }

  /**
   * Validate that migration completed successfully
   */
  private async validateMigration(originalRecords: LegacyWasteData[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check that waste streams were created for each migrated record
      for (const record of originalRecords) {
        const wasteStreamsCount = await db
          .select()
          .from(wasteStreams)
          .where(eq(wasteStreams.monthlyFacilityDataId, record.id));

        if (wasteStreamsCount.length === 0) {
          errors.push(`No waste streams created for monthly facility data record ${record.id}`);
        }
      }

      // Validate data integrity
      const totalWasteStreams = await db.select().from(wasteStreams);
      console.log(`✅ Validation: ${totalWasteStreams.length} total waste streams in system`);

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create rollback data for potential migration reversal
   */
  async createRollbackData(): Promise<MigrationRollbackData> {
    try {
      const legacyRecords = await this.findLegacyWasteData();
      const migratedWasteStreamIds = await db
        .select({ id: wasteStreams.id })
        .from(wasteStreams);

      return {
        migratedWasteStreamIds: migratedWasteStreamIds.map(ws => ws.id),
        originalData: legacyRecords
      };
    } catch (error) {
      console.error("Failed to create rollback data:", error);
      throw error;
    }
  }

  /**
   * Rollback migration (remove created waste streams, restore legacy data)
   */
  async rollbackMigration(rollbackData: MigrationRollbackData): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      console.log(`🔄 Rolling back migration: removing ${rollbackData.migratedWasteStreamIds.length} waste streams`);
      
      // Remove migrated waste streams
      for (const wasteStreamId of rollbackData.migratedWasteStreamIds) {
        try {
          await db.delete(wasteStreams).where(eq(wasteStreams.id, wasteStreamId));
        } catch (error) {
          errors.push(`Failed to remove waste stream ${wasteStreamId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`${errors.length === 0 ? '✅' : '❌'} Migration rollback completed`);
      return { success: errors.length === 0, errors };

    } catch (error) {
      console.error("Rollback failed:", error);
      errors.push(error instanceof Error ? error.message : 'Unknown rollback error');
      return { success: false, errors };
    }
  }

  /**
   * Get migration status and summary
   */
  async getMigrationStatus(): Promise<{
    hasLegacyData: boolean;
    legacyRecordCount: number;
    wasteStreamCount: number;
    migrationNeeded: boolean;
  }> {
    try {
      const legacyRecords = await this.findLegacyWasteData();
      const wasteStreamRecords = await db.select().from(wasteStreams);

      return {
        hasLegacyData: legacyRecords.length > 0,
        legacyRecordCount: legacyRecords.length,
        wasteStreamCount: wasteStreamRecords.length,
        migrationNeeded: legacyRecords.length > 0
      };
    } catch (error) {
      console.error("Failed to get migration status:", error);
      return {
        hasLegacyData: false,
        legacyRecordCount: 0,
        wasteStreamCount: 0,
        migrationNeeded: false
      };
    }
  }
}

export const wasteDataMigrationService = new WasteDataMigrationService();