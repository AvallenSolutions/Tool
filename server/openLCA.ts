import fetch from 'node-fetch';

// OpenLCA API Configuration
const OPENLCA_CONFIG = {
  serverUrl: process.env.OPENLCA_SERVER_URL || 'http://localhost:8080',
  apiKey: process.env.OPENLCA_API_KEY || '',
  databaseId: process.env.OPENLCA_DATABASE_ID || 'ecoinvent',
};

// OpenLCA Data Types
export interface OlcaRef {
  '@type': string;
  '@id': string;
  name?: string;
  description?: string;
}

export interface OlcaFlow extends OlcaRef {
  '@type': 'Flow';
  flowType: 'ELEMENTARY_FLOW' | 'PRODUCT_FLOW' | 'WASTE_FLOW';
  referenceFlowProperty: OlcaRef;
}

export interface OlcaProcess extends OlcaRef {
  '@type': 'Process';
  processType: 'UNIT_PROCESS' | 'LCI_RESULT';
  quantitativeReference: OlcaRef;
  exchanges: OlcaExchange[];
}

export interface OlcaExchange {
  '@type': 'Exchange';
  flow: OlcaRef;
  flowProperty: OlcaRef;
  unit: OlcaRef;
  amount: number;
  isInput: boolean;
  isQuantitativeReference?: boolean;
}

export interface OlcaProductSystem extends OlcaRef {
  '@type': 'ProductSystem';
  referenceProcess: OlcaRef;
  referenceExchange: OlcaRef;
  targetAmount: number;
  targetUnit: OlcaRef;
  processes: OlcaRef[];
}

export interface OlcaImpactMethod extends OlcaRef {
  '@type': 'ImpactMethod';
  impactCategories: OlcaRef[];
}

export interface OlcaCalculationSetup {
  '@type': 'CalculationSetup';
  productSystem: OlcaRef;
  impactMethod: OlcaRef;
  targetAmount: number;
  allocationMethod?: string;
  parameterRedefs?: any[];
}

export interface OlcaSimpleResult {
  '@type': 'SimpleResult';
  productSystem: OlcaRef;
  impactResults: Array<{
    impactCategory: OlcaRef;
    value: number;
  }>;
  totalFlowResults: Array<{
    flow: OlcaRef;
    value: number;
  }>;
}

// JSON-RPC Client for OpenLCA
export class OpenLCAClient {
  private baseUrl: string;
  private apiKey: string;
  private databaseId: string;

  constructor() {
    this.baseUrl = OPENLCA_CONFIG.serverUrl;
    this.apiKey = OPENLCA_CONFIG.apiKey;
    this.databaseId = OPENLCA_CONFIG.databaseId;
  }

  // Generic JSON-RPC request method
  private async jsonRpcRequest<T>(method: string, params: any = {}): Promise<T> {
    const requestBody = {
      jsonrpc: '2.0',
      method,
      params: {
        ...params,
        '@id': this.databaseId,
      },
      id: Date.now(),
    };

    const response = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenLCA API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`OpenLCA RPC error: ${result.error.message}`);
    }

    return result.result;
  }

  // Search for flows by name
  async searchFlows(query: string, flowType?: string): Promise<OlcaFlow[]> {
    const params: any = {
      query,
      type: 'Flow',
    };

    if (flowType) {
      params.flowType = flowType;
    }

    return this.jsonRpcRequest<OlcaFlow[]>('search', params);
  }

  // Search for processes by name
  async searchProcesses(query: string, processType?: string): Promise<OlcaProcess[]> {
    const params: any = {
      query,
      type: 'Process',
    };

    if (processType) {
      params.processType = processType;
    }

    return this.jsonRpcRequest<OlcaProcess[]>('search', params);
  }

  // Get a specific flow by ID
  async getFlow(flowId: string): Promise<OlcaFlow> {
    return this.jsonRpcRequest<OlcaFlow>('get', { '@id': flowId });
  }

  // Get a specific process by ID
  async getProcess(processId: string): Promise<OlcaProcess> {
    return this.jsonRpcRequest<OlcaProcess>('get', { '@id': processId });
  }

  // Create a new product system
  async createProductSystem(system: Omit<OlcaProductSystem, '@id'>): Promise<OlcaProductSystem> {
    return this.jsonRpcRequest<OlcaProductSystem>('insert', system);
  }

  // Create a new process
  async createProcess(process: Omit<OlcaProcess, '@id'>): Promise<OlcaProcess> {
    return this.jsonRpcRequest<OlcaProcess>('insert', process);
  }

  // Update a product system
  async updateProductSystem(system: OlcaProductSystem): Promise<OlcaProductSystem> {
    return this.jsonRpcRequest<OlcaProductSystem>('update', system);
  }

  // Search for impact methods
  async searchImpactMethods(query: string): Promise<OlcaImpactMethod[]> {
    return this.jsonRpcRequest<OlcaImpactMethod[]>('search', {
      query,
      type: 'ImpactMethod',
    });
  }

  // Calculate impact assessment
  async calculate(setup: OlcaCalculationSetup): Promise<OlcaSimpleResult> {
    return this.jsonRpcRequest<OlcaSimpleResult>('calculate', setup);
  }

  // Get all flows (for caching/mapping)
  async getAllFlows(): Promise<OlcaFlow[]> {
    return this.jsonRpcRequest<OlcaFlow[]>('getAll', { type: 'Flow' });
  }

  // Get all processes (for caching/mapping)
  async getAllProcesses(): Promise<OlcaProcess[]> {
    return this.jsonRpcRequest<OlcaProcess[]>('getAll', { type: 'Process' });
  }

  // Test connection to OpenLCA server
  async testConnection(): Promise<boolean> {
    try {
      // Only test connection if server URL is properly configured
      if (!this.baseUrl || this.baseUrl === 'http://localhost:8080') {
        
        return false;
      }
      
      await this.jsonRpcRequest('ping');
      return true;
    } catch (error) {
      
      return false;
    }
  }

  // Get database info
  async getDatabaseInfo(): Promise<any> {
    return this.jsonRpcRequest('getDatabase');
  }
}

// Singleton instance
export const openLCAClient = new OpenLCAClient();

// Utility functions for OpenLCA integration
export class OpenLCAUtils {
  // Find best matching flow for a given input
  static async findBestFlowMatch(
    inputName: string,
    inputType: string,
    inputCategory: string
  ): Promise<OlcaFlow | null> {
    try {
      const flows = await openLCAClient.searchFlows(inputName);
      
      if (flows.length === 0) {
        return null;
      }

      // Simple scoring algorithm - prioritize exact matches and common flows
      const scoredFlows = flows.map(flow => {
        let score = 0;
        const flowName = flow.name?.toLowerCase() || '';
        const queryName = inputName.toLowerCase();

        // Exact match gets highest score
        if (flowName === queryName) {
          score += 100;
        }

        // Partial match
        if (flowName.includes(queryName) || queryName.includes(flowName)) {
          score += 50;
        }

        // Word match
        const flowWords = flowName.split(/\s+/);
        const queryWords = queryName.split(/\s+/);
        const commonWords = flowWords.filter(word => queryWords.includes(word));
        score += commonWords.length * 10;

        return { flow, score };
      });

      // Sort by score and return best match
      scoredFlows.sort((a, b) => b.score - a.score);
      return scoredFlows[0].flow;
    } catch (error) {
      console.error('Error finding flow match:', error);
      return null;
    }
  }

  // Find best matching process for a given operation
  static async findBestProcessMatch(
    processName: string,
    processType: string,
    region?: string
  ): Promise<OlcaProcess | null> {
    try {
      let query = processName;
      if (region) {
        query += ` ${region}`;
      }

      const processes = await openLCAClient.searchProcesses(query);
      
      if (processes.length === 0) {
        return null;
      }

      // Simple scoring algorithm
      const scoredProcesses = processes.map(process => {
        let score = 0;
        const processNameLower = process.name?.toLowerCase() || '';
        const queryLower = processName.toLowerCase();

        // Exact match gets highest score
        if (processNameLower === queryLower) {
          score += 100;
        }

        // Partial match
        if (processNameLower.includes(queryLower) || queryLower.includes(processNameLower)) {
          score += 50;
        }

        // Region match bonus
        if (region && processNameLower.includes(region.toLowerCase())) {
          score += 20;
        }

        return { process, score };
      });

      // Sort by score and return best match
      scoredProcesses.sort((a, b) => b.score - a.score);
      return scoredProcesses[0].process;
    } catch (error) {
      console.error('Error finding process match:', error);
      return null;
    }
  }

  // Create a unique product system name
  static generateProductSystemName(productName: string, sku: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${productName} (${sku}) - ${timestamp}`;
  }

  // Validate OpenLCA configuration
  static validateConfiguration(): boolean {
    const serverUrl = process.env.OPENLCA_SERVER_URL;
    const databaseId = process.env.OPENLCA_DATABASE_ID;

    if (!serverUrl || serverUrl === 'http://localhost:8080') {
      
      return false;
    }

    if (!databaseId) {
      
    }

    return true;
  }
}

export default OpenLCAClient;