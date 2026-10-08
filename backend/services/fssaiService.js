const fs = require('fs');
const path = require('path');

let additivesDb = {};
let ingredientsDb = {};

try {
  additivesDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fssai/additives.json'), 'utf8'));
  ingredientsDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fssai/ingredients.json'), 'utf8'));
} catch (err) {
  console.warn('FSSAI reference data missing or malformed.');
}

class FssaiService {
  checkAdditive(additiveName) {
    const key = Object.keys(additivesDb).find(k => k.toLowerCase() === additiveName.toLowerCase());
    if (key) {
      const data = additivesDb[key];
      return {
        identifiedAs: key,
        name: data.name,
        classification: data.classification,
        status: data.fssaiStatus,
        source: data.source,
        certainty: 'high'
      };
    }
    return {
      identifiedAs: additiveName,
      status: 'unknown',
      certainty: 'low',
      source: 'none'
    };
  }

  checkIngredient(ingredientName) {
    const key = Object.keys(ingredientsDb).find(k => k.toLowerCase() === ingredientName.toLowerCase());
    if (key) {
      const data = ingredientsDb[key];
      return {
        identifiedAs: key,
        isAllergen: data.isAllergen,
        allergenType: data.allergenType || null,
        status: data.fssaiStatus,
        source: data.source,
        certainty: 'high'
      };
    }
    return {
      identifiedAs: ingredientName,
      isAllergen: 'unknown',
      allergenType: null,
      status: 'unknown',
      certainty: 'low',
      source: 'none'
    };
  }

  analyzeCompliance(product) {
    if (!product) {
      throw new Error('Product required for FSSAI analysis.');
    }

    const rawIngredients = product.ingredients?.ingredients || [];
    const additiveAnalysis = [];
    const ingredientAnalysis = [];
    let overallStatus = 'compliant';
    let overallCertainty = 'high';

    // Fallback: If no structured ingredients array exists, we must mark as unknown.
    if (!rawIngredients || rawIngredients.length === 0) {
      return {
        complianceStatus: 'unknown',
        certainty: 'low',
        additiveAnalysis: [],
        ingredientAnalysis: [],
        disclaimer: "No ingredient list available for FSSAI verification."
      };
    }

    let hasUnknownIngredients = false;

    rawIngredients.forEach(item => {
      // Basic classification by name
      if (item.toLowerCase().includes('ins ') || item.toLowerCase().match(/\be\d{3,4}\b/i)) {
         const analysis = this.checkAdditive(item);
         additiveAnalysis.push(analysis);
         if (analysis.status === 'restricted' || analysis.status === 'non_compliant') {
           overallStatus = analysis.status;
         }
         if (analysis.status === 'unknown') {
           overallCertainty = 'low';
           hasUnknownIngredients = true;
         }
      } else {
         const analysis = this.checkIngredient(item);
         ingredientAnalysis.push(analysis);
         
         if (analysis.status === 'restricted' || analysis.status === 'non_compliant') {
           if (overallStatus !== 'non_compliant') overallStatus = analysis.status;
         }
         if (analysis.status === 'unknown') {
           overallCertainty = 'low';
           hasUnknownIngredients = true;
         }
      }
    });

    if (overallCertainty === 'low' && overallStatus === 'compliant') {
       overallStatus = 'unknown'; // Do not assume compliant just because nothing failed.
    }

    // Process Allergens
    const allergens = [];
    let allergensFullyKnown = !hasUnknownIngredients;

    ingredientAnalysis.forEach(ing => {
      if (ing.isAllergen === true && ing.allergenType) {
        allergens.push({ name: ing.allergenType, status: 'detected', sourceItem: ing.identifiedAs });
      } else if (ing.isAllergen === 'unknown') {
        allergensFullyKnown = false;
      }
    });

    return {
      complianceStatus: overallStatus, 
      certainty: overallCertainty,
      additiveAnalysis,
      ingredientAnalysis,
      allergens: allergens.length > 0 ? allergens : (allergensFullyKnown ? [] : [{ status: 'unknown', name: 'Unknown Data' }]),
      disclaimer: "FSSAI legal verification requires comprehensive authoritative data."
    };
  }
}

const fssaiServiceInstance = new FssaiService();

module.exports = {
  name: 'fssai_compliance_checker',
  description: 'Checks product ingredients and claims against FSSAI regulatory guidelines. Returns structured compliance status based on authoritative data.',
  inputSchema: {
    product: { type: 'object', required: true }
  },
  execute: async (input, context) => {
    return fssaiServiceInstance.analyzeCompliance(input.product);
  }
};
