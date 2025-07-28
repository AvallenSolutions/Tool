import { openLCAClient, OpenLCAUtils } from './openLCA';
import { storage } from './storage';
import type { ProductInput, OlcaFlowMapping, OlcaProcessMapping } from '@shared/schema';

// LCA Mapping Service for connecting user inputs to OpenLCA flows and processes
export class LCAMappingService {
  private flowMappingCache: Map<string, OlcaFlowMapping[]> = new Map();
  private processMappingCache: Map<string, OlcaProcessMapping[]> = new Map();

  // Initialize the mapping service with cached data
  async initialize(): Promise<void> {
    try {
      // Load existing mappings from database
      const flowMappings = await storage.getAllFlowMappings();
      const processMappings = await storage.getAllProcessMappings();

      // Cache mappings for quick lookup
      for (const mapping of flowMappings) {
        const key = this.generateFlowCacheKey(mapping.inputName, mapping.inputType, mapping.inputCategory);
        if (!this.flowMappingCache.has(key)) {
          this.flowMappingCache.set(key, []);
        }
        this.flowMappingCache.get(key)!.push(mapping);
      }

      for (const mapping of processMappings) {
        const key = this.generateProcessCacheKey(mapping.processName, mapping.processType);
        if (!this.processMappingCache.has(key)) {
          this.processMappingCache.set(key, []);
        }
        this.processMappingCache.get(key)!.push(mapping);
      }

      
    } catch (error) {
      console.error('Error initializing LCA mapping service:', error);
    }
  }

  // Map a product input to OpenLCA flow
  async mapInputToFlow(
    inputName: string,
    inputType: string,
    inputCategory: string,
    forceRefresh: boolean = false
  ): Promise<OlcaFlowMapping | null> {
    const cacheKey = this.generateFlowCacheKey(inputName, inputType, inputCategory);
    
    // Check cache first
    if (!forceRefresh && this.flowMappingCache.has(cacheKey)) {
      const mappings = this.flowMappingCache.get(cacheKey)!;
      if (mappings.length > 0) {
        // Return mapping with highest confidence score
        return mappings.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))[0];
      }
    }

    try {
      // Search OpenLCA for matching flow
      const flow = await OpenLCAUtils.findBestFlowMatch(inputName, inputType, inputCategory);
      
      if (!flow) {
        console.warn(`No OpenLCA flow found for input: ${inputName} (${inputType})`);
        return null;
      }

      // Create new mapping
      const mapping: OlcaFlowMapping = {
        id: 0, // Will be set by database
        inputName,
        inputType,
        inputCategory,
        olcaFlowId: flow['@id'],
        olcaFlowName: flow.name || '',
        olcaUnit: flow.referenceFlowProperty?.name || '',
        confidenceScore: this.calculateFlowConfidenceScore(inputName, flow.name || ''),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      const savedMapping = await storage.createFlowMapping(mapping);

      // Update cache
      if (!this.flowMappingCache.has(cacheKey)) {
        this.flowMappingCache.set(cacheKey, []);
      }
      this.flowMappingCache.get(cacheKey)!.push(savedMapping);

      return savedMapping;
    } catch (error) {
      console.error('Error mapping input to flow:', error);
      return null;
    }
  }

  // Map a process to OpenLCA process
  async mapToProcess(
    processName: string,
    processType: string,
    region?: string,
    forceRefresh: boolean = false
  ): Promise<OlcaProcessMapping | null> {
    const cacheKey = this.generateProcessCacheKey(processName, processType);
    
    // Check cache first
    if (!forceRefresh && this.processMappingCache.has(cacheKey)) {
      const mappings = this.processMappingCache.get(cacheKey)!;
      if (mappings.length > 0) {
        // Return mapping that best matches region, or first one
        const regionMatch = mappings.find(m => m.region === region);
        return regionMatch || mappings[0];
      }
    }

    try {
      // Search OpenLCA for matching process
      const process = await OpenLCAUtils.findBestProcessMatch(processName, processType, region);
      
      if (!process) {
        console.warn(`No OpenLCA process found for: ${processName} (${processType})`);
        return null;
      }

      // Create new mapping
      const mapping: OlcaProcessMapping = {
        id: 0, // Will be set by database
        processName,
        processType,
        olcaProcessId: process['@id'],
        olcaProcessName: process.name || '',
        region: region || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      const savedMapping = await storage.createProcessMapping(mapping);

      // Update cache
      if (!this.processMappingCache.has(cacheKey)) {
        this.processMappingCache.set(cacheKey, []);
      }
      this.processMappingCache.get(cacheKey)!.push(savedMapping);

      return savedMapping;
    } catch (error) {
      console.error('Error mapping to process:', error);
      return null;
    }
  }

  // Calculate confidence score for flow mapping
  private calculateFlowConfidenceScore(inputName: string, flowName: string): number {
    const inputLower = inputName.toLowerCase();
    const flowLower = flowName.toLowerCase();

    // Exact match
    if (inputLower === flowLower) {
      return 1.0;
    }

    // Substring match
    if (inputLower.includes(flowLower) || flowLower.includes(inputLower)) {
      return 0.8;
    }

    // Word overlap
    const inputWords = inputLower.split(/\s+/);
    const flowWords = flowLower.split(/\s+/);
    const commonWords = inputWords.filter(word => flowWords.includes(word));
    const overlapRatio = commonWords.length / Math.max(inputWords.length, flowWords.length);

    return Math.max(0.1, overlapRatio);
  }

  // Generate cache key for flow mapping
  private generateFlowCacheKey(inputName: string, inputType: string, inputCategory: string): string {
    return `${inputName}|${inputType}|${inputCategory}`.toLowerCase();
  }

  // Generate cache key for process mapping
  private generateProcessCacheKey(processName: string, processType: string): string {
    return `${processName}|${processType}`.toLowerCase();
  }

  // Clear mapping cache
  clearCache(): void {
    this.flowMappingCache.clear();
    this.processMappingCache.clear();
  }

  // Get mapping statistics
  getMappingStats(): {
    flowMappings: number;
    processMappings: number;
    totalCacheSize: number;
  } {
    const flowMappings = Array.from(this.flowMappingCache.values()).reduce((sum, arr) => sum + arr.length, 0);
    const processMappings = Array.from(this.processMappingCache.values()).reduce((sum, arr) => sum + arr.length, 0);
    
    return {
      flowMappings,
      processMappings,
      totalCacheSize: this.flowMappingCache.size + this.processMappingCache.size,
    };
  }
}

// Predefined mapping configurations for common beverage industry inputs
export const BEVERAGE_MAPPING_CONFIG = {
  // Agricultural inputs
  agriculturalInputs: [
    { name: 'apples', keywords: ['apple', 'apple production', 'orchard'], category: 'fruit' },
    { name: 'grapes', keywords: ['grape', 'grape production', 'vineyard'], category: 'fruit' },
    { name: 'barley', keywords: ['barley', 'barley production', 'grain'], category: 'grain' },
    { name: 'hops', keywords: ['hop', 'hops production'], category: 'herb' },
    { name: 'sugar', keywords: ['sugar', 'sugar production', 'sucrose'], category: 'sweetener' },
    { name: 'water', keywords: ['water', 'water supply', 'mains water'], category: 'water' },
  ],

  // Packaging materials
  packagingInputs: [
    { name: 'glass', keywords: ['glass', 'glass production', 'container glass'], category: 'packaging' },
    { name: 'aluminium', keywords: ['aluminium', 'aluminum', 'can production'], category: 'packaging' },
    { name: 'PET', keywords: ['PET', 'polyethylene terephthalate', 'plastic bottle'], category: 'packaging' },
    { name: 'paper', keywords: ['paper', 'paper production', 'kraft paper'], category: 'packaging' },
    { name: 'cork', keywords: ['cork', 'cork production', 'natural cork'], category: 'packaging' },
  ],

  // Transportation modes
  transportModes: [
    { name: 'truck', keywords: ['lorry', 'truck', 'road transport'], category: 'transport' },
    { name: 'rail', keywords: ['rail', 'railway', 'train'], category: 'transport' },
    { name: 'ship', keywords: ['ship', 'maritime', 'ocean freight'], category: 'transport' },
    { name: 'air', keywords: ['air', 'airplane', 'aviation'], category: 'transport' },
  ],

  // Energy sources
  energySources: [
    { name: 'electricity', keywords: ['electricity', 'electric power', 'grid mix'], category: 'energy' },
    { name: 'natural_gas', keywords: ['natural gas', 'gas', 'methane'], category: 'energy' },
    { name: 'diesel', keywords: ['diesel', 'diesel fuel', 'gasoil'], category: 'energy' },
  ],

  // Processing operations
  processingOperations: [
    { name: 'distillation', keywords: ['distillation', 'distilling', 'alcohol production'], category: 'processing' },
    { name: 'fermentation', keywords: ['fermentation', 'brewing', 'alcoholic fermentation'], category: 'processing' },
    { name: 'bottling', keywords: ['bottling', 'filling', 'packaging'], category: 'processing' },
    { name: 'pasteurization', keywords: ['pasteurization', 'heating', 'sterilization'], category: 'processing' },
  ],
};

// Singleton instance
export const lcaMappingService = new LCAMappingService();