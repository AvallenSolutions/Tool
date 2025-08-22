// Test OpenLCA calculation debugging
async function testMolassesCalculation() {
  console.log('Testing molasses calculation...');
  
  try {
    const response = await fetch('http://localhost:5000/api/lca/test-calculation/Molasses, cane?amount=1&unit=kg');
    const data = await response.text();
    console.log('Response:', data);
    
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Failed to parse as JSON, might be HTML error page');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testIngredientSearch() {
  console.log('Testing ingredient search...');
  
  try {
    const response = await fetch('http://localhost:5000/api/lca/ingredients/search?q=molasses');
    const data = await response.json();
    console.log('Search results:', data.slice(0, 3));
    
    const molassesCane = data.find(item => item.materialName === 'Molasses, cane');
    if (molassesCane) {
      console.log('Molasses cane CO2:', molassesCane.co2ePerUnit);
    }
  } catch (error) {
    console.error('Search Error:', error);
  }
}

// Run tests
testMolassesCalculation();
testIngredientSearch();