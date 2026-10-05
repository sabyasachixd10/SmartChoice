/**
 * Processing Analysis Service
 * 
 * Provides deterministic structured analysis of food processing classifications,
 * NOVA groups, and explicit preparation metadata.
 */

const NOVA_DESCRIPTIONS = {
  1: "Unprocessed or minimally processed foods",
  2: "Processed culinary ingredients",
  3: "Processed foods",
  4: "Ultra-processed foods"
};

const PREPARATION_KEYWORDS = [
  'fried', 'baked', 'roasted', 'boiled', 'air-fried', 'grilled', 'steamed', 'smoked'
];

const analyzeNova = (product) => {
  const novaGroup = product.processing?.novaGroup;
  
  if (novaGroup && NOVA_DESCRIPTIONS[novaGroup]) {
    return {
      available: true,
      group: novaGroup,
      label: NOVA_DESCRIPTIONS[novaGroup],
      source: 'Open Food Facts',
      confidence: 'source-provided'
    };
  }
  
  return {
    available: false,
    value: null
  };
};

const analyzeProcessingIndicators = (product) => {
  const labels = product.processing?.labels || [];
  
  // Filter labels to only include structured source labels
  // Remove empty or generic labels if needed, but for now we expose what's in the array
  const indicators = labels
    .filter(label => label && typeof label === 'string')
    .map(label => label.trim().toLowerCase());

  return {
    available: indicators.length > 0,
    indicators
  };
};

const analyzePreparation = (product) => {
  const labels = product.processing?.labels || [];
  const categories = product.identity?.categories || [];
  
  const allTags = [...labels, ...categories].map(t => t.toLowerCase());
  const methodsFound = new Set();
  
  allTags.forEach(tag => {
    PREPARATION_KEYWORDS.forEach(keyword => {
      // Look for the keyword as a standalone word or tag
      if (tag === keyword || tag.includes(`-${keyword}`) || tag.includes(`${keyword}-`) || tag.includes(` ${keyword} `) || tag.startsWith(`${keyword} `) || tag.endsWith(` ${keyword}`)) {
        methodsFound.add(keyword);
      }
    });
  });

  const methods = Array.from(methodsFound);

  if (methods.length > 0) {
    return {
      available: true,
      methods
    };
  }

  return {
    available: false,
    methods: []
  };
};

const generateFindings = (novaAnalysis, processingIndicators, preparation) => {
  const findings = [];

  if (novaAnalysis.available) {
    findings.push('NOVA classification available.');
    findings.push(`Product classified as NOVA ${novaAnalysis.group} (${novaAnalysis.label}).`);
  } else {
    findings.push('NOVA classification unavailable.');
  }

  if (processingIndicators.available) {
    findings.push('Processing metadata available.');
  } else {
    findings.push('Processing metadata unavailable.');
  }

  if (preparation.available) {
    findings.push(`Explicit preparation method(s) detected: ${preparation.methods.join(', ')}.`);
  } else {
    findings.push('Preparation method unavailable.');
  }

  return findings;
};

const analyzeProcessing = (product) => {
  if (!product) {
    throw new Error('Product object is required for processing analysis');
  }

  const nova = analyzeNova(product);
  const processingIndicators = analyzeProcessingIndicators(product);
  const preparation = analyzePreparation(product);

  const findings = generateFindings(nova, processingIndicators, preparation);
  const limitations = [];

  if (!nova.available) {
    limitations.push("Missing NOVA classification data");
  }
  if (!processingIndicators.available) {
    limitations.push("Missing structured processing tags");
  }

  return {
    productId: product._id || product.identity?.barcode,
    nova,
    processingIndicators,
    preparation,
    findings,
    limitations,
    confidence: nova.available ? 'high' : 'low'
  };
};

module.exports = {
  analyzeProcessing,
  analyzeNova,
  analyzeProcessingIndicators,
  analyzePreparation
};
