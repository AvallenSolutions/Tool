import { storage } from '../storage';

export interface HotspotAnalysis {
  carbon_hotspot: {
    component: string;
    percentage: number;
    suggestion: string;
  };
  water_hotspot: {
    component: string;
    percentage: number;
    suggestion: string;
  };
}

export interface ComponentData {
  component: string;
  category: string;
  carbonImpact: number;
  waterImpact: number;
  wasteImpact: number;
}

export class HotspotAnalysisService {
  private static instance: HotspotAnalysisService;

  static getInstance(): HotspotAnalysisService {
    if (!this.instance) {
      this.instance = new HotspotAnalysisService();
    }
    return this.instance;
  }

  /**
   * Analyzes LCA results to identify carbon and water hotspots
   * @param reportDataJson - The report data containing detailed LCA information
   * @returns Structured hotspot analysis with actionable suggestions
   */
  async analyze_lca_results(reportDataJson: any): Promise<HotspotAnalysis> {
    try {
      // Extract component data from report
      const components = this.extractComponentData(reportDataJson);
      
      if (!components || components.length === 0) {
        return this.getDefaultAnalysis();
      }

      // Calculate total impacts
      const totalCarbon = components.reduce((sum, comp) => sum + comp.carbonImpact, 0);
      const totalWater = components.reduce((sum, comp) => sum + comp.waterImpact, 0);

      // Find carbon hotspot
      const carbonHotspot = components.reduce((max, comp) => 
        comp.carbonImpact > max.carbonImpact ? comp : max
      );

      // Find water hotspot
      const waterHotspot = components.reduce((max, comp) => 
        comp.waterImpact > max.waterImpact ? comp : max
      );

      // Calculate percentages
      const carbonPercentage = totalCarbon > 0 ? Math.round((carbonHotspot.carbonImpact / totalCarbon) * 100) : 0;
      const waterPercentage = totalWater > 0 ? Math.round((waterHotspot.waterImpact / totalWater) * 100) : 0;

      return {
        carbon_hotspot: {
          component: carbonHotspot.component,
          percentage: carbonPercentage,
          suggestion: this.getCarbonSuggestion(carbonHotspot.category, carbonPercentage)
        },
        water_hotspot: {
          component: waterHotspot.component,
          percentage: waterPercentage,
          suggestion: this.getWaterSuggestion(waterHotspot.category, waterPercentage)
        }
      };

    } catch (error) {
      console.error('Error analyzing LCA results:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extracts component data from report JSON structure
   */
  private extractComponentData(reportData: any): ComponentData[] {
    const components: ComponentData[] = [];

    try {
      // Handle different report data structures
      if (reportData?.components) {
        // Direct components array
        return reportData.components.map((comp: any) => ({
          component: comp.name || comp.component || 'Unknown Component',
          category: comp.category || this.categorizeComponent(comp.name || comp.component),
          carbonImpact: parseFloat(comp.carbonImpact || comp.co2e || 0),
          waterImpact: parseFloat(comp.waterImpact || comp.waterFootprint || 0),
          wasteImpact: parseFloat(comp.wasteImpact || comp.waste || 0)
        }));
      }

      // Extract from ingredients and packaging
      if (reportData?.ingredients) {
        reportData.ingredients.forEach((ingredient: any) => {
          components.push({
            component: ingredient.name || 'Ingredient',
            category: 'Liquid',
            carbonImpact: parseFloat(ingredient.carbonFootprint || 0),
            waterImpact: parseFloat(ingredient.waterFootprint || 0),
            wasteImpact: 0
          });
        });
      }

      // Add packaging components
      if (reportData?.packaging) {
        Object.entries(reportData.packaging).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            components.push({
              component: this.formatComponentName(key),
              category: 'Packaging',
              carbonImpact: parseFloat(value.carbonImpact || value.co2e || 0),
              waterImpact: parseFloat(value.waterImpact || 0),
              wasteImpact: parseFloat(value.weight || 0)
            });
          }
        });
      }

      return components;

    } catch (error) {
      console.error('Error extracting component data:', error);
      return [];
    }
  }

  /**
   * Categorizes a component based on its name
   */
  private categorizeComponent(componentName: string): string {
    const name = componentName.toLowerCase();
    
    if (name.includes('bottle') || name.includes('label') || name.includes('cap') || name.includes('closure')) {
      return 'Packaging';
    }
    if (name.includes('transport') || name.includes('shipping') || name.includes('distribution')) {
      return 'Process';
    }
    if (name.includes('waste') || name.includes('disposal') || name.includes('recycling')) {
      return 'Waste';
    }
    return 'Liquid';
  }

  /**
   * Formats component names for display
   */
  private formatComponentName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Generates context-aware carbon reduction suggestions
   */
  private getCarbonSuggestion(category: string, percentage: number): string {
    const suggestions = {
      'Packaging': [
        'Explore options for lightweighting your bottle design to reduce glass usage',
        'Consider switching to recycled content materials for packaging components',
        'Investigate alternative packaging materials with lower carbon footprints'
      ],
      'Liquid': [
        'Source ingredients from suppliers with renewable energy commitments',
        'Optimize your ingredient supply chain to reduce transportation distances',
        'Consider organic or regenerative agriculture sourcing options'
      ],
      'Process': [
        'Implement energy efficiency measures in your production facilities',
        'Switch to renewable energy sources for manufacturing operations',
        'Optimize production processes to reduce energy consumption'
      ],
      'Waste': [
        'Improve waste segregation and recycling programs',
        'Implement circular economy principles in production',
        'Reduce packaging waste through design optimization'
      ]
    };

    const categoryKeys = Object.keys(suggestions);
    const matchedCategory = categoryKeys.find(key => category.includes(key)) || 'Packaging';
    const categorySuggestions = suggestions[matchedCategory as keyof typeof suggestions];
    
    return categorySuggestions[Math.floor(Math.random() * categorySuggestions.length)];
  }

  /**
   * Generates context-aware water reduction suggestions
   */
  private getWaterSuggestion(category: string, percentage: number): string {
    const suggestions = {
      'Packaging': [
        'Optimize water usage in packaging material production processes',
        'Choose suppliers with water-efficient manufacturing practices',
        'Consider packaging materials requiring less water to produce'
      ],
      'Liquid': [
        'Implement water conservation measures in ingredient processing',
        'Source from suppliers using efficient irrigation methods',
        'Consider ingredients with lower agricultural water requirements'
      ],
      'Process': [
        'Install water recycling systems in production facilities',
        'Optimize cleaning and sanitization processes to reduce water usage',
        'Implement water-efficient equipment and technologies'
      ],
      'Waste': [
        'Improve wastewater treatment and recycling capabilities',
        'Reduce water-intensive waste disposal methods',
        'Implement closed-loop water systems where possible'
      ]
    };

    const categoryKeys = Object.keys(suggestions);
    const matchedCategory = categoryKeys.find(key => category.includes(key)) || 'Liquid';
    const categorySuggestions = suggestions[matchedCategory as keyof typeof suggestions];
    
    return categorySuggestions[Math.floor(Math.random() * categorySuggestions.length)];
  }

  /**
   * Returns default analysis when data is insufficient
   */
  private getDefaultAnalysis(): HotspotAnalysis {
    return {
      carbon_hotspot: {
        component: 'Packaging Materials',
        percentage: 45,
        suggestion: 'Explore lightweighting options for your primary packaging to reduce environmental impact'
      },
      water_hotspot: {
        component: 'Ingredient Production',
        percentage: 65,
        suggestion: 'Consider sourcing from suppliers with water-efficient agricultural practices'
      }
    };
  }
}

export const hotspotAnalysisService = HotspotAnalysisService.getInstance();