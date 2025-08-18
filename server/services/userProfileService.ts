import { db } from '../db';
import { 
  companies, 
  products, 
  companyData, 
  companyFootprintData,
  lcaQuestionnaires,
  reports,
  users
} from '@shared/schema';
import { eq, and, count } from 'drizzle-orm';

export interface ProfileCompletenessData {
  companyId: number;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  overallCompleteness: number;
  sections: {
    companyProfile: {
      completeness: number;
      missing: string[];
    };
    products: {
      completeness: number;
      totalProducts: number;
      productsWithLCA: number;
      missing: string[];
    };
    carbonFootprint: {
      completeness: number;
      scope1Complete: boolean;
      scope2Complete: boolean;
      scope3Complete: boolean;
      missing: string[];
    };
    reports: {
      completeness: number;
      totalReports: number;
      approvedReports: number;
      missing: string[];
    };
  };
  lastActivity: string;
  onboardingComplete: boolean;
}

export interface UserListItem {
  companyId: number;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  overallCompleteness: number;
  lastActivity: string;
  onboardingComplete: boolean;
  needsAttention: boolean;
}

export class UserProfileService {
  
  async getUserProfileCompleteness(companyId: number): Promise<ProfileCompletenessData | null> {
    try {
      // Get company and owner information
      const [companyData] = await db
        .select({
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          size: companies.size,
          address: companies.address,
          country: companies.country,
          website: companies.website,
          onboardingComplete: companies.onboardingComplete,
          primaryMotivation: companies.primaryMotivation,
          currentReportingPeriodStart: companies.currentReportingPeriodStart,
          currentReportingPeriodEnd: companies.currentReportingPeriodEnd,
          updatedAt: companies.updatedAt,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerEmail: users.email,
        })
        .from(companies)
        .leftJoin(users, eq(companies.ownerId, users.id))
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!companyData) return null;

      // Analyze company profile completeness
      const companyProfileMissing: string[] = [];
      if (!companyData.industry) companyProfileMissing.push('Industry');
      if (!companyData.size) companyProfileMissing.push('Company Size');
      if (!companyData.address) companyProfileMissing.push('Address');
      if (!companyData.country) companyProfileMissing.push('Country');
      if (!companyData.primaryMotivation) companyProfileMissing.push('Primary Motivation');
      if (!companyData.currentReportingPeriodStart) companyProfileMissing.push('Reporting Period Start');
      if (!companyData.currentReportingPeriodEnd) companyProfileMissing.push('Reporting Period End');

      const companyProfileCompleteness = Math.round(
        ((7 - companyProfileMissing.length) / 7) * 100
      );

      // Analyze products
      const allProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.companyId, companyId));

      const productsWithLCA = await db
        .select({ id: lcaQuestionnaires.id })
        .from(lcaQuestionnaires)
        .innerJoin(products, eq(lcaQuestionnaires.productId, products.id))
        .where(eq(products.companyId, companyId));

      const productsMissing: string[] = [];
      if (allProducts.length === 0) productsMissing.push('No products created');
      if (productsWithLCA.length < allProducts.length) {
        productsMissing.push(`${allProducts.length - productsWithLCA.length} products missing LCA data`);
      }

      const productsCompleteness = allProducts.length === 0 ? 0 : 
        Math.round((productsWithLCA.length / allProducts.length) * 100);

      // Analyze carbon footprint data
      const scope1Data = await db
        .select({ id: companyFootprintData.id })
        .from(companyFootprintData)
        .where(and(
          eq(companyFootprintData.companyId, companyId),
          eq(companyFootprintData.scope, 1)
        ));

      const scope2Data = await db
        .select({ id: companyFootprintData.id })
        .from(companyFootprintData)
        .where(and(
          eq(companyFootprintData.companyId, companyId),
          eq(companyFootprintData.scope, 2)
        ));

      const scope3Data = await db
        .select({ id: companyFootprintData.id })
        .from(companyFootprintData)
        .where(and(
          eq(companyFootprintData.companyId, companyId),
          eq(companyFootprintData.scope, 3)
        ));

      const carbonFootprintMissing: string[] = [];
      const scope1Complete = scope1Data.length > 0;
      const scope2Complete = scope2Data.length > 0;
      const scope3Complete = scope3Data.length > 0;

      if (!scope1Complete) carbonFootprintMissing.push('Scope 1 emissions data');
      if (!scope2Complete) carbonFootprintMissing.push('Scope 2 emissions data');
      if (!scope3Complete) carbonFootprintMissing.push('Scope 3 emissions data');

      const carbonFootprintCompleteness = Math.round(
        ([scope1Complete, scope2Complete, scope3Complete].filter(Boolean).length / 3) * 100
      );

      // Analyze reports
      const allReports = await db
        .select({ 
          id: reports.id,
          status: reports.status 
        })
        .from(reports)
        .where(eq(reports.companyId, companyId));

      const approvedReports = allReports.filter((r: any) => r.status === 'approved');
      
      const reportsMissing: string[] = [];
      if (allReports.length === 0) reportsMissing.push('No reports generated');
      if (approvedReports.length === 0) reportsMissing.push('No approved reports');
      if (allReports.some((r: any) => r.status === 'pending_review')) {
        reportsMissing.push('Reports pending admin review');
      }

      const reportsCompleteness = allReports.length === 0 ? 0 : 
        Math.round((approvedReports.length / allReports.length) * 100);

      // Calculate overall completeness
      const sectionWeights = {
        companyProfile: 0.25,
        products: 0.30,
        carbonFootprint: 0.30,
        reports: 0.15
      };

      const overallCompleteness = Math.round(
        (companyProfileCompleteness * sectionWeights.companyProfile) +
        (productsCompleteness * sectionWeights.products) +
        (carbonFootprintCompleteness * sectionWeights.carbonFootprint) +
        (reportsCompleteness * sectionWeights.reports)
      );

      return {
        companyId: companyData.id,
        companyName: companyData.name,
        ownerName: `${companyData.ownerFirstName || ''} ${companyData.ownerLastName || ''}`.trim() || 'Unknown',
        ownerEmail: companyData.ownerEmail || 'No email',
        overallCompleteness,
        sections: {
          companyProfile: {
            completeness: companyProfileCompleteness,
            missing: companyProfileMissing
          },
          products: {
            completeness: productsCompleteness,
            totalProducts: allProducts.length,
            productsWithLCA: productsWithLCA.length,
            missing: productsMissing
          },
          carbonFootprint: {
            completeness: carbonFootprintCompleteness,
            scope1Complete,
            scope2Complete,
            scope3Complete,
            missing: carbonFootprintMissing
          },
          reports: {
            completeness: reportsCompleteness,
            totalReports: allReports.length,
            approvedReports: approvedReports.length,
            missing: reportsMissing
          }
        },
        lastActivity: companyData.updatedAt?.toISOString() || new Date().toISOString(),
        onboardingComplete: companyData.onboardingComplete || false
      };

    } catch (error) {
      console.error('Error analyzing user profile completeness:', error);
      throw error;
    }
  }

  async getAllUsersWithCompleteness(
    limit: number = 50, 
    offset: number = 0,
    searchTerm?: string
  ): Promise<UserListItem[]> {
    try {
      // Get all companies with basic info
      let companiesQuery = db
        .select({
          id: companies.id,
          name: companies.name,
          onboardingComplete: companies.onboardingComplete,
          updatedAt: companies.updatedAt,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerEmail: users.email,
        })
        .from(companies)
        .leftJoin(users, eq(companies.ownerId, users.id))
        .limit(limit)
        .offset(offset);

      const allCompanies = await companiesQuery;

      // Calculate completeness for each company
      const userList: UserListItem[] = [];
      
      for (const company of allCompanies) {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const nameMatch = company.name.toLowerCase().includes(searchLower);
          const emailMatch = company.ownerEmail?.toLowerCase().includes(searchLower);
          const ownerMatch = `${company.ownerFirstName || ''} ${company.ownerLastName || ''}`.toLowerCase().includes(searchLower);
          
          if (!nameMatch && !emailMatch && !ownerMatch) continue;
        }

        try {
          const completenessData = await this.getUserProfileCompleteness(company.id);
          if (completenessData) {
            userList.push({
              companyId: company.id,
              companyName: company.name,
              ownerName: completenessData.ownerName,
              ownerEmail: completenessData.ownerEmail,
              overallCompleteness: completenessData.overallCompleteness,
              lastActivity: completenessData.lastActivity,
              onboardingComplete: company.onboardingComplete || false,
              needsAttention: completenessData.overallCompleteness < 50 || !company.onboardingComplete
            });
          }
        } catch (error) {
          console.error(`Error processing company ${company.id}:`, error);
          // Include company with basic info even if completeness calculation fails
          userList.push({
            companyId: company.id,
            companyName: company.name,
            ownerName: `${company.ownerFirstName || ''} ${company.ownerLastName || ''}`.trim() || 'Unknown',
            ownerEmail: company.ownerEmail || 'No email',
            overallCompleteness: 0,
            lastActivity: company.updatedAt?.toISOString() || new Date().toISOString(),
            onboardingComplete: company.onboardingComplete || false,
            needsAttention: true
          });
        }
      }

      return userList.sort((a, b) => {
        // Sort by needs attention first, then by completeness
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        return a.overallCompleteness - b.overallCompleteness;
      });

    } catch (error) {
      console.error('Error fetching users with completeness:', error);
      throw error;
    }
  }

  async getIncompleteUsers(threshold: number = 50): Promise<UserListItem[]> {
    const allUsers = await this.getAllUsersWithCompleteness(100, 0);
    return allUsers.filter(user => 
      user.overallCompleteness < threshold || user.needsAttention
    );
  }
}

export const userProfileService = new UserProfileService();