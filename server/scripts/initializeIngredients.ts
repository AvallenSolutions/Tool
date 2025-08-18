import { OpenLCAService } from '../services/OpenLCAService';

/**
 * Initialize the LCA process mappings table with common agricultural ingredients
 */
async function initializeIngredients() {
  console.log('🌱 Initializing LCA process mappings with common agricultural ingredients...');
  
  try {
    await OpenLCAService.initializeCommonIngredients();
    console.log('✅ Successfully initialized ingredient database');
  } catch (error) {
    console.error('❌ Error initializing ingredients:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeIngredients();
}

export { initializeIngredients };