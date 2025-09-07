import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  companyKpiGoals,
  kpiDefinitions,
  companies,
  products,
  companyFootprintData,
  verifiedSuppliers,
  users,
  type CompanyKpiGoal
} from "@shared/schema";
import { generateSustainabilityContent } from "../anthropic";

export interface InsightRecommendation {
  type: 'optimization' | 'best_practice' | 'warning';
  title: string;
  description: string;
  confidence: number;
  potentialImpact: 'high' | 'medium' | 'low';
  actionable: boolean;
  goalId?: string;
  linkedGoalName?: string;
}

export interface CompanyPerformanceData {
  totalEmissions: number;
  waterUsage: number;
  wasteGenerated: number;
  productsCount: number;
  goalsCount: number;
  averageGoalProgress: number;
  recentImprovements: string[];
  concernAreas: string[];
}

export interface PlatformBenchmarks {
  avgEmissionsPerProduct: number;
  avgWaterUsagePerProduct: number;
  avgGoalAchievementRate: number;
  topPerformingCompanies: number;
  commonSuccessFactors: string[];
  industryBestPractices: string[];
}

export class IntelligentInsightsService {

  /**
   * Generate intelligent insights for a specific category and company
   */
  async generateCategoryInsights(
    companyId: number, 
    category: string
  ): Promise<{ recommendations: InsightRecommendation[] }> {
    try {
      console.log(`🤖 Generating AI insights for company ${companyId}, category: ${category}`);

      // Get company data and active goals for the category
      const [companyData, categoryGoals, companyPerformance, platformBenchmarks] = await Promise.all([
        this.getCompanyData(companyId),
        this.getActiveGoalsByCategory(companyId, category),
        this.getCompanyPerformanceData(companyId),
        this.getPlatformBenchmarks()
      ]);

      if (!companyData) {
        throw new Error(`Company not found: ${companyId}`);
      }

      // Generate AI prompt with structured data
      const aiPrompt = this.buildAIPrompt(
        companyData,
        categoryGoals,
        companyPerformance,
        platformBenchmarks,
        category
      );

      // Get AI recommendations
      const aiResponse = await generateSustainabilityContent(aiPrompt);
      
      // Parse and structure the AI response
      const recommendations = await this.parseAIResponse(aiResponse, categoryGoals);

      console.log(`✅ Generated ${recommendations.length} AI-powered insights for ${category}`);
      return { recommendations };

    } catch (error) {
      console.error('Error generating intelligent insights:', error);
      
      // Fallback to basic recommendations if AI fails
      return {
        recommendations: await this.getFallbackRecommendations(companyId, category)
      };
    }
  }

  /**
   * Get active goals for a specific category (using KPI definition names as category filter)
   */
  private async getActiveGoalsByCategory(companyId: number, category: string): Promise<CompanyKpiGoal[]> {
    // Query goals with their KPI definitions to filter by category-like names
    const goals = await db
      .select()
      .from(companyKpiGoals)
      .leftJoin(kpiDefinitions, eq(companyKpiGoals.kpiDefinitionId, kpiDefinitions.id))
      .where(eq(companyKpiGoals.companyId, companyId))
      .orderBy(desc(companyKpiGoals.createdAt));

    // Filter by category in the goal name or KPI definition name
    return goals
      .filter(result => {
        const goal = result.company_kpi_goals;
        const kpiDef = result.kpi_definitions;
        const categoryLower = category.toLowerCase();
        
        return kpiDef?.name?.toLowerCase().includes(categoryLower) ||
               kpiDef?.description?.toLowerCase().includes(categoryLower);
      })
      .map(result => result.company_kpi_goals);
  }

  /**
   * Get comprehensive company data
   */
  private async getCompanyData(companyId: number) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    return company;
  }

  /**
   * Analyze company performance across key metrics
   */
  private async getCompanyPerformanceData(companyId: number): Promise<CompanyPerformanceData> {
    // Get products count
    const [productsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.companyId, companyId));

    // Get goals stats
    const [goalsResult] = await db
      .select({ 
        count: sql<number>`count(*)`,
        avgTargetReduction: sql<number>`coalesce(avg(target_reduction_percentage), 0)`
      })
      .from(companyKpiGoals)
      .where(
        and(
          eq(companyKpiGoals.companyId, companyId),
          eq(companyKpiGoals.isActive, true)
        )
      );

    // Get footprint data (simplified for insights)
    const footprintData = await db
      .select()
      .from(companyFootprintData)
      .where(eq(companyFootprintData.companyId, companyId))
      .limit(10);

    const totalEmissions = footprintData.reduce((sum, item) => 
      sum + (parseFloat(item.calculatedEmissions?.toString() || '0')), 0
    );

    // Analyze recent improvements and concerns
    const recentImprovements: string[] = [];
    const concernAreas: string[] = [];

    if (goalsResult.avgTargetReduction > 15) {
      recentImprovements.push("Ambitious sustainability targets set");
    } else if (goalsResult.avgTargetReduction < 5) {
      concernAreas.push("Conservative reduction targets");
    }

    if (productsResult.count > 3) {
      recentImprovements.push("Diverse product portfolio for impact tracking");
    }

    if (totalEmissions > 1000) {
      concernAreas.push("High carbon footprint requiring attention");
    }

    return {
      totalEmissions,
      waterUsage: 0, // TODO: Calculate from actual data
      wasteGenerated: 0, // TODO: Calculate from actual data  
      productsCount: productsResult.count,
      goalsCount: goalsResult.count,
      averageGoalProgress: goalsResult.avgTargetReduction || 0,
      recentImprovements,
      concernAreas
    };
  }

  /**
   * Get platform-wide benchmarks for context
   */
  private async getPlatformBenchmarks(): Promise<PlatformBenchmarks> {
    // Get platform-wide statistics
    const [totalCompanies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies);

    const [totalProducts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products);

    const [goalStats] = await db
      .select({ 
        avgProgress: sql<number>`coalesce(avg(target_reduction_percentage), 0)`,
        count: sql<number>`count(*)`
      })
      .from(companyKpiGoals)
      .where(eq(companyKpiGoals.isActive, true));

    const [totalSuppliers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verifiedSuppliers);

    // Calculate benchmarks
    const avgEmissionsPerProduct = totalProducts.count > 0 ? 850 / totalProducts.count : 0;
    const avgWaterUsagePerProduct = totalProducts.count > 0 ? 2500 / totalProducts.count : 0;
    
    return {
      avgEmissionsPerProduct,
      avgWaterUsagePerProduct,
      avgGoalAchievementRate: goalStats.avgProgress || 0,
      topPerformingCompanies: Math.ceil(totalCompanies.count * 0.2),
      commonSuccessFactors: [
        "Regular monthly data collection",
        "Clear milestone tracking",
        "Supply chain engagement",
        "Technology optimization"
      ],
      industryBestPractices: [
        "Set science-based targets",
        "Implement circular economy principles",
        "Use renewable energy sources",
        "Engage suppliers in sustainability initiatives",
        "Regular third-party verification"
      ]
    };
  }

  /**
   * Build structured AI prompt with all context data
   */
  private buildAIPrompt(
    company: any,
    goals: CompanyKpiGoal[],
    performance: CompanyPerformanceData,
    benchmarks: PlatformBenchmarks,
    category: string
  ): string {
    const goalsContext = goals.map(goal => 
      `- ${goal.kpiName}: ${goal.progress}% complete (Target: ${goal.targetReductionPercentage}% reduction by ${goal.targetDate})`
    ).join('\n');

    return `You are a sustainability expert advisor analyzing ${company.name || 'a company'}'s ${category} performance. 
Provide 3 specific, actionable recommendations based on the data below.

COMPANY CONTEXT:
- Industry: ${company.industry || 'Not specified'}
- Company Size: ${company.size || 'Not specified'}
- Location: ${company.country || 'Not specified'}

ACTIVE ${category.toUpperCase()} GOALS:
${goalsContext || 'No active goals set for this category'}

CURRENT PERFORMANCE:
- Products tracked: ${performance.productsCount}
- Active goals: ${performance.goalsCount}
- Average goal progress: ${performance.averageGoalProgress.toFixed(1)}%
- Total emissions: ${performance.totalEmissions.toFixed(1)} kg CO2e
- Recent improvements: ${performance.recentImprovements.join(', ') || 'None identified'}
- Areas of concern: ${performance.concernAreas.join(', ') || 'None identified'}

PLATFORM BENCHMARKS:
- Platform average goal achievement: ${benchmarks.avgGoalAchievementRate.toFixed(1)}%
- Top ${benchmarks.topPerformingCompanies} companies show best practices

REQUIREMENTS:
1. Link recommendations directly to specific active goals when possible
2. Use actual performance data to identify gaps and opportunities  
3. Reference platform benchmarks for context
4. Provide specific, measurable actions
5. Include confidence level (0.0-1.0) based on data quality

Return ONLY a JSON array with exactly 3 recommendations in this format:
[
  {
    "type": "optimization|best_practice|warning",
    "title": "Specific recommendation title",
    "description": "Detailed description with specific actions and expected outcomes",
    "confidence": 0.85,
    "potentialImpact": "high|medium|low",
    "actionable": true,
    "goalId": "goal_id_if_linked_to_specific_goal",
    "linkedGoalName": "Goal name if linked"
  }
]

Focus on ${category} specifically. Be precise and use the actual data provided.`;
  }

  /**
   * Parse AI response and structure recommendations
   */
  private async parseAIResponse(
    aiResponse: string, 
    goals: CompanyKpiGoal[]
  ): Promise<InsightRecommendation[]> {
    try {
      // Clean the response to extract JSON
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON array
      const jsonStart = cleanedResponse.indexOf('[');
      const jsonEnd = cleanedResponse.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }

      const recommendations: InsightRecommendation[] = JSON.parse(cleanedResponse);
      
      // Validate and enhance recommendations
      return recommendations.map(rec => ({
        type: ['optimization', 'best_practice', 'warning'].includes(rec.type) ? rec.type : 'optimization',
        title: rec.title || 'Sustainability Recommendation',
        description: rec.description || 'Improve your sustainability performance',
        confidence: Math.max(0, Math.min(1, rec.confidence || 0.7)),
        potentialImpact: ['high', 'medium', 'low'].includes(rec.potentialImpact) ? rec.potentialImpact : 'medium',
        actionable: rec.actionable !== false,
        goalId: rec.goalId,
        linkedGoalName: rec.linkedGoalName
      }));

    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Return basic structured recommendations if parsing fails
      return [
        {
          type: 'optimization',
          title: 'Set Monthly Progress Reviews',
          description: 'Implement monthly progress reviews for all active sustainability goals to maintain momentum and identify early interventions.',
          confidence: 0.9,
          potentialImpact: 'high',
          actionable: true
        },
        {
          type: 'best_practice', 
          title: 'Benchmark Against Industry Leaders',
          description: 'Compare your performance metrics with top-performing companies in your industry to identify improvement opportunities.',
          confidence: 0.8,
          potentialImpact: 'medium',
          actionable: true
        },
        {
          type: 'warning',
          title: 'Focus on Data Quality',
          description: 'Ensure consistent data collection and verification to maintain accuracy in sustainability reporting and goal tracking.',
          confidence: 0.85,
          potentialImpact: 'high',
          actionable: true
        }
      ];
    }
  }

  /**
   * Fallback recommendations when AI service fails
   */
  private async getFallbackRecommendations(
    companyId: number, 
    category: string
  ): Promise<InsightRecommendation[]> {
    const goals = await this.getActiveGoalsByCategory(companyId, category);
    
    const recommendations: InsightRecommendation[] = [
      {
        type: 'optimization',
        title: `Optimize ${category} Performance`,
        description: `Focus on improving your ${category.toLowerCase()} metrics through systematic measurement and targeted interventions.`,
        confidence: 0.7,
        potentialImpact: 'high',
        actionable: true
      }
    ];

    if (goals.length === 0) {
      recommendations.push({
        type: 'warning',
        title: `Set ${category} Goals`,
        description: `Establish measurable ${category.toLowerCase()} goals to track progress and drive improvement initiatives.`,
        confidence: 0.9,
        potentialImpact: 'high',
        actionable: true
      });
    } else {
      const avgProgress = goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / goals.length;
      
      if (avgProgress < 50) {
        recommendations.push({
          type: 'warning',
          title: 'Accelerate Goal Progress',
          description: `Your ${category.toLowerCase()} goals are progressing slower than expected. Consider additional resources or strategy adjustments.`,
          confidence: 0.8,
          potentialImpact: 'high',
          actionable: true
        });
      }
    }

    recommendations.push({
      type: 'best_practice',
      title: 'Engage Stakeholders',
      description: `Involve key stakeholders in your ${category.toLowerCase()} initiatives to increase buy-in and accelerate progress.`,
      confidence: 0.75,
      potentialImpact: 'medium',
      actionable: true
    });

    return recommendations.slice(0, 3);
  }
}

// Export singleton instance
export const intelligentInsightsService = new IntelligentInsightsService();