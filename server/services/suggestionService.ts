import type { Company, Product, CompanyGoal, CustomReport } from "@shared/schema";
import { storage } from "../storage";

export interface NextStepSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
  estimatedTime: string;
}

export class SuggestionService {
  
  /**
   * Generates prioritized list of 1-3 "What's Next?" actions based on company's current state
   */
  async getNextSteps(companyId: number): Promise<NextStepSuggestion[]> {
    const suggestions: NextStepSuggestion[] = [];
    
    // Get company data
    const company = await storage.getCompanyById(companyId);
    const products = await storage.getProductsByCompany(companyId);
    const goals = await storage.getGoalsByCompany(companyId);
    const customReports = await storage.getReportsByCompanyCustom(companyId);
    
    // Priority 1: Complete onboarding if not done
    if (!company?.onboardingComplete) {
      suggestions.push({
        id: 'complete-onboarding',
        title: 'Complete Your Company Profile',
        description: 'Finish setting up your company details to unlock all features',
        priority: 'high',
        actionUrl: '/app/onboarding',
        estimatedTime: '5 minutes'
      });
    }
    
    // Priority 2: Add first product if none exist
    if (products.length === 0) {
      suggestions.push({
        id: 'add-first-product',
        title: 'Add Your First Product',
        description: 'Start tracking environmental impact by adding a product',
        priority: 'high',
        actionUrl: '/app/products/create/enhanced',
        estimatedTime: '10 minutes'
      });
    }
    
    // Priority 3: Set sustainability goals if none exist
    if (goals.length === 0 && products.length > 0) {
      suggestions.push({
        id: 'set-first-goal',
        title: 'Set Your First Sustainability Goal',
        description: 'Define measurable targets to track your progress',
        priority: 'medium',
        actionUrl: '/app/company',
        estimatedTime: '8 minutes'
      });
    }
    
    // Priority 4: Complete product data if products exist but have missing data
    const incompleteProducts = products.filter(p => !p.ingredients || p.ingredients.length === 0);
    if (incompleteProducts.length > 0) {
      suggestions.push({
        id: 'complete-product-data',
        title: `Complete Data for ${incompleteProducts.length} Product${incompleteProducts.length > 1 ? 's' : ''}`,
        description: 'Add ingredient and packaging details for accurate LCA calculations',
        priority: 'medium',
        actionUrl: `/app/products/${incompleteProducts[0].id}/edit`,
        estimatedTime: '15 minutes'
      });
    }
    
    // Priority 5: Generate first report if none exist but have products
    if (customReports.length === 0 && products.length > 0) {
      suggestions.push({
        id: 'create-first-report',
        title: 'Generate Your First Sustainability Report',
        description: 'Create a professional report to share your environmental impact',
        priority: 'low',
        actionUrl: '/app/reports',
        estimatedTime: '20 minutes'
      });
    }
    
    // Return max 3 suggestions, sorted by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return suggestions
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 3);
  }
}

export const suggestionService = new SuggestionService();