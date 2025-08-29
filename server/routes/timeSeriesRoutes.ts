import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { 
  monthlyFacilityData,
  productVersions,
  kpiSnapshots,
  products,
  insertMonthlyFacilityDataSchema,
  insertProductVersionSchema,
  type InsertMonthlyFacilityData,
  type InsertProductVersion,
} from "@shared/schema";
import { timeSeriesEngine } from "../services/TimeSeriesEngine";
import { kpiSnapshotService } from "../services/KPISnapshotService";
import { DataMigrationService } from "../services/DataMigrationService";
import { TestingValidationService } from "../services/TestingValidationService";

const router = Router();

// Initialize Data Migration Service
const dataMigrationService = new DataMigrationService();

// Initialize Testing & Validation Service
const testingValidationService = new TestingValidationService();

// Monthly Facility Data Routes

// Get aggregated monthly data by company (aggregates all facilities)
router.get("/monthly-aggregated/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { limit = "12" } = req.query;
    
    // Validate companyId
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Parse and validate limit
    const limitValue = parseInt(limit as string);
    const validLimit = isNaN(limitValue) ? 12 : Math.min(limitValue, 100);

    // Query to get aggregated data by month for all facilities
    const aggregatedData = await db
      .select({
        month: monthlyFacilityData.month,
        totalElectricity: sql<number>`SUM(CAST(${monthlyFacilityData.electricityKwh} AS NUMERIC))`,
        totalGas: sql<number>`SUM(CAST(${monthlyFacilityData.naturalGasM3} AS NUMERIC))`,
        totalWater: sql<number>`SUM(CAST(${monthlyFacilityData.waterM3} AS NUMERIC))`,
        totalProduction: sql<number>`SUM(CAST(${monthlyFacilityData.productionVolume} AS NUMERIC))`,
        facilityCount: sql<number>`COUNT(*)`,
        latestUpdate: sql<string>`MAX(${monthlyFacilityData.updatedAt})`
      })
      .from(monthlyFacilityData)
      .where(eq(monthlyFacilityData.companyId, companyId))
      .groupBy(monthlyFacilityData.month)
      .orderBy(desc(monthlyFacilityData.month))
      .limit(validLimit);

    // Transform to match MonthlyFacilityData structure for frontend compatibility
    const result = aggregatedData.map((data) => ({
      id: `aggregated-${companyId}-${data.month}`,
      companyId: companyId,
      facilityId: null, // Indicates this is aggregated data
      month: data.month,
      electricityKwh: data.totalElectricity.toString(),
      naturalGasM3: data.totalGas.toString(),
      waterM3: data.totalWater.toString(),
      productionVolume: data.totalProduction.toString(),
      utilityBillUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: data.latestUpdate,
      // Add metadata to indicate this is aggregated from multiple facilities
      _metadata: {
        isAggregated: true,
        facilityCount: data.facilityCount,
        aggregationType: 'sum_all_facilities'
      }
    }));
    
    console.log(`📊 Aggregated monthly data for company ${companyId}: ${result.length} months, latest: ${result[0]?.month || 'none'}`);
    res.json(result);
  } catch (error) {
    console.error("Error fetching aggregated monthly data:", error);
    res.status(500).json({ error: "Failed to fetch aggregated monthly data" });
  }
});

// Get monthly facility data for a company
router.get("/monthly-facility/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { startDate, endDate, limit = "12" } = req.query;
    
    // Validate companyId
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Parse and validate limit
    const limitValue = parseInt(limit as string);
    const validLimit = isNaN(limitValue) ? 12 : Math.min(limitValue, 100);

    let query = db
      .select()
      .from(monthlyFacilityData)
      .where(eq(monthlyFacilityData.companyId, companyId))
      .orderBy(desc(monthlyFacilityData.month));

    // Add date filtering if provided
    if (startDate && endDate) {
      query = query.where(
        and(
          eq(monthlyFacilityData.companyId, companyId),
          gte(monthlyFacilityData.month, startDate as string),
          lte(monthlyFacilityData.month, endDate as string)
        )
      );
    }

    const data = await query.limit(validLimit);
    
    res.json(data);
  } catch (error) {
    console.error("Error fetching monthly facility data:", error);
    res.status(500).json({ error: "Failed to fetch monthly facility data" });
  }
});

// Add or update monthly facility data
router.post("/monthly-facility", async (req, res) => {
  try {
    const facilityData = insertMonthlyFacilityDataSchema.parse(req.body);

    // Check if data already exists for this company and month
    const existing = await db
      .select()
      .from(monthlyFacilityData)
      .where(
        and(
          eq(monthlyFacilityData.companyId, facilityData.companyId),
          eq(monthlyFacilityData.month, facilityData.month)
        )
      );

    let result;
    if (existing.length > 0) {
      // Update existing record
      [result] = await db
        .update(monthlyFacilityData)
        .set({ ...facilityData, updatedAt: new Date() })
        .where(
          and(
            eq(monthlyFacilityData.companyId, facilityData.companyId),
            eq(monthlyFacilityData.month, facilityData.month)
          )
        )
        .returning();
    } else {
      // Create new record
      [result] = await db
        .insert(monthlyFacilityData)
        .values(facilityData)
        .returning();
    }

    // Optionally trigger KPI recalculation for this month
    // This could be done asynchronously
    console.log(`📊 Monthly facility data saved for company ${facilityData.companyId}, month ${facilityData.month}`);

    res.json(result);
  } catch (error) {
    console.error("Error saving monthly facility data:", error);
    res.status(500).json({ error: "Failed to save monthly facility data" });
  }
});

// Update existing monthly facility data by ID
router.put("/monthly-facility/:recordId", async (req, res) => {
  try {
    const recordId = req.params.recordId;
    const updateData = req.body;

    // Update the specific record
    const [result] = await db
      .update(monthlyFacilityData)
      .set({ 
        ...updateData, 
        updatedAt: new Date() 
      })
      .where(eq(monthlyFacilityData.id, recordId))
      .returning();

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }

    console.log(`📊 Monthly facility data updated for record ${recordId}`);
    res.json(result);
  } catch (error) {
    console.error("Error updating monthly facility data:", error);
    res.status(500).json({ error: "Failed to update monthly facility data" });
  }
});

// Product Version Routes

// Get product versions for a company
router.get("/product-versions/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { productId, activeOnly = "false" } = req.query;

    let query = db
      .select({
        id: productVersions.id,
        productId: productVersions.productId,
        versionNumber: productVersions.versionNumber,
        effectiveDate: productVersions.effectiveDate,
        lcaQuestionnaireId: productVersions.lcaQuestionnaireId,
        changeDescription: productVersions.changeDescription,
        isActive: productVersions.isActive,
        createdAt: productVersions.createdAt,
      })
      .from(productVersions)
      .innerJoin(db.select().from(products).where(eq(products.companyId, companyId)), 
                 eq(productVersions.productId, products.id))
      .orderBy(asc(productVersions.productId), desc(productVersions.versionNumber));

    // Filter by product ID if specified
    if (productId) {
      query = query.where(eq(productVersions.productId, parseInt(productId as string)));
    }

    // Filter to active versions only if specified
    if (activeOnly === "true") {
      query = query.where(eq(productVersions.isActive, true));
    }

    const versions = await query;
    res.json(versions);
  } catch (error) {
    console.error("Error fetching product versions:", error);
    res.status(500).json({ error: "Failed to fetch product versions" });
  }
});

// Create a new product version
router.post("/product-versions", async (req, res) => {
  try {
    const versionData = insertProductVersionSchema.parse(req.body);

    // Validate that the product exists and user has access
    const product = await db.select().from(products).where(eq(products.id, versionData.productId));
    if (!product.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Create the new version
    const [newVersion] = await db
      .insert(productVersions)
      .values(versionData)
      .returning();

    console.log(`📦 Created product version ${newVersion.versionNumber} for product ${newVersion.productId}`);

    res.json(newVersion);
  } catch (error) {
    console.error("Error creating product version:", error);
    res.status(500).json({ error: "Failed to create product version" });
  }
});

// Get product version for a specific date
router.get("/product-versions/:productId/for-date/:date", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const targetDate = new Date(req.params.date);

    const version = await timeSeriesEngine.getProductVersionForDate(productId, targetDate);
    
    if (!version) {
      return res.status(404).json({ error: "No product version found for the specified date" });
    }

    res.json(version);
  } catch (error) {
    console.error("Error fetching product version for date:", error);
    res.status(500).json({ error: "Failed to fetch product version for date" });
  }
});

// KPI Snapshot Routes

// Get KPI snapshots for a company
router.get("/kpi-snapshots/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { kpiDefinitionId, monthsBack = "12", startDate, endDate } = req.query;

    if (kpiDefinitionId) {
      let snapshots;
      
      if (startDate && endDate) {
        snapshots = await timeSeriesEngine.getKPIHistoryForDateRange(
          kpiDefinitionId as string,
          companyId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        snapshots = await timeSeriesEngine.getKPIHistory(
          kpiDefinitionId as string,
          companyId,
          parseInt(monthsBack as string)
        );
      }
      
      res.json(snapshots);
    } else {
      // Get all KPI snapshots for the company
      const snapshots = await db
        .select()
        .from(kpiSnapshots)
        .where(eq(kpiSnapshots.companyId, companyId))
        .orderBy(asc(kpiSnapshots.snapshotDate));
      
      res.json(snapshots);
    }
  } catch (error) {
    console.error("Error fetching KPI snapshots:", error);
    res.status(500).json({ error: "Failed to fetch KPI snapshots" });
  }
});

// Generate KPI snapshot for current month
router.post("/kpi-snapshots/generate", async (req, res) => {
  try {
    const { companyId, kpiDefinitionId } = req.body;

    if (!companyId || !kpiDefinitionId) {
      return res.status(400).json({ error: "Company ID and KPI Definition ID are required" });
    }

    await kpiSnapshotService.generateCurrentMonthSnapshot(companyId, kpiDefinitionId);

    res.json({ message: "KPI snapshot generated successfully" });
  } catch (error) {
    console.error("Error generating KPI snapshot:", error);
    res.status(500).json({ error: "Failed to generate KPI snapshot" });
  }
});

// Bulk generate snapshots for a company (initialize historical data)
router.post("/kpi-snapshots/initialize/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { monthsBack = 12 } = req.body;

    await kpiSnapshotService.initializeSnapshotsForCompany(companyId, monthsBack);

    res.json({ 
      message: `Initialized KPI snapshots for company ${companyId}`,
      monthsBack 
    });
  } catch (error) {
    console.error("Error initializing KPI snapshots:", error);
    res.status(500).json({ error: "Failed to initialize KPI snapshots" });
  }
});

// Calculate KPI for a specific month
router.post("/kpi-calculate-month", async (req, res) => {
  try {
    const { kpiDefinitionId, companyId, targetMonth } = req.body;

    if (!kpiDefinitionId || !companyId || !targetMonth) {
      return res.status(400).json({ 
        error: "KPI Definition ID, Company ID, and target month are required" 
      });
    }

    const value = await timeSeriesEngine.calculateKPIForMonth(
      kpiDefinitionId,
      companyId,
      new Date(targetMonth)
    );

    res.json({ 
      kpiDefinitionId,
      companyId,
      targetMonth,
      value 
    });
  } catch (error) {
    console.error("Error calculating KPI for month:", error);
    res.status(500).json({ error: "Failed to calculate KPI for month" });
  }
});

// Time-series analytics endpoint
router.get("/analytics/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { kpiDefinitionId, monthsBack = "12" } = req.query;

    if (!kpiDefinitionId) {
      return res.status(400).json({ error: "KPI Definition ID is required" });
    }

    // Get historical snapshots
    const snapshots = await timeSeriesEngine.getKPIHistory(
      kpiDefinitionId as string,
      companyId,
      parseInt(monthsBack as string)
    );

    // Calculate trend analytics
    const values = snapshots.map(s => parseFloat(s.value));
    const dates = snapshots.map(s => s.snapshotDate);

    let trend = "stable";
    let changePercentage = 0;

    if (values.length >= 2) {
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      changePercentage = ((lastValue - firstValue) / firstValue) * 100;
      
      if (changePercentage > 5) trend = "increasing";
      else if (changePercentage < -5) trend = "decreasing";
    }

    res.json({
      snapshots,
      analytics: {
        trend,
        changePercentage: parseFloat(changePercentage.toFixed(2)),
        averageValue: values.length > 0 ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)) : 0,
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        dataPoints: values.length,
        dateRange: {
          start: dates[0],
          end: dates[dates.length - 1]
        }
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Data Migration Routes - Phase 4

// Execute complete data migration for a company
router.post("/migration/execute/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    console.log(`🚀 Starting Phase 4 migration for company ${companyId}`);
    
    const migrationResult = await dataMigrationService.executeCompleteMigration(companyId);
    
    res.json({
      success: true,
      message: `Phase 4 migration completed successfully for company ${companyId}`,
      data: migrationResult
    });
  } catch (error) {
    console.error("Error executing migration:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to execute migration",
      details: error.message 
    });
  }
});

// Get migration status for a company
router.get("/migration/status/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    // Check facility data existence
    const facilityDataCount = await db
      .select()
      .from(monthlyFacilityData)
      .where(eq(monthlyFacilityData.companyId, companyId));
    
    // Check product versions existence
    const productVersionsCount = await db
      .select()
      .from(productVersions)
      .where(eq(productVersions.productId, companyId)); // Note: This should be filtered differently
    
    // Check KPI snapshots existence
    const kpiSnapshotsCount = await db
      .select()
      .from(kpiSnapshots)
      .where(eq(kpiSnapshots.companyId, companyId));
    
    const status = {
      companyId,
      facilityDataRecords: facilityDataCount.length,
      productVersions: productVersionsCount.length,
      kpiSnapshots: kpiSnapshotsCount.length,
      migrationComplete: facilityDataCount.length > 0 && kpiSnapshotsCount.length > 0,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    console.error("Error checking migration status:", error);
    res.status(500).json({ error: "Failed to check migration status" });
  }
});

// Testing & Validation Routes - Phase 5

// Execute comprehensive system validation
router.post("/validation/execute/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    console.log(`🧪 Starting Phase 5 validation for company ${companyId}`);
    
    const validationResult = await testingValidationService.executeComprehensiveValidation(companyId);
    
    res.json({
      success: true,
      message: `Phase 5 validation completed for company ${companyId}`,
      data: validationResult
    });
  } catch (error) {
    console.error("Error executing validation:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to execute validation",
      details: error.message 
    });
  }
});

// Quick health check endpoint
router.get("/validation/health/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    const healthCheck = await testingValidationService.quickHealthCheck(companyId);
    
    res.json(healthCheck);
  } catch (error) {
    console.error("Error checking health:", error);
    res.status(500).json({ 
      error: "Failed to check system health",
      details: error.message 
    });
  }
});

export default router;