const classifyGeminiError = (error) => {
  const status = error.status || (error.response ? error.response.status : null);
  const message = (error.message || '').toLowerCase();
  
  if (
    status === 429 && 
    (message.includes('quota') || 
     message.includes('resource_exhausted') || 
     message.includes('generate_content_free_tier_requests') ||
     message.includes('exhausted'))
  ) {
    return {
      type: "GEMINI_QUOTA_EXHAUSTED",
      retryable: false,
      status: 429,
      message: "Gemini API quota is currently exhausted.",
      provider: "gemini"
    };
  }

  if (status === 429) {
    return {
      type: "GEMINI_TEMPORARY_UNAVAILABLE",
      retryable: true,
      status: 429,
      provider: "gemini",
      message: "Gemini API is temporarily rate limited."
    };
  }

  if (status === 503 || status === 502 || status === 504 || message.includes('503')) {
    return {
      type: "GEMINI_TEMPORARY_UNAVAILABLE",
      retryable: true,
      status: status || 503,
      provider: "gemini",
      message: "Gemini API is temporarily unavailable."
    };
  }

  if (status === 401 || status === 403 || message.includes('api key') || message.includes('permission') || message.includes('unauthorized')) {
    return {
      type: "GEMINI_AUTH_ERROR",
      retryable: false,
      status: status || 401,
      provider: "gemini",
      message: "Gemini API authentication failed."
    };
  }

  if (status === 400 || message.includes('invalid') || message.includes('malformed')) {
    return {
      type: "GEMINI_INVALID_REQUEST",
      retryable: false,
      status: status || 400,
      provider: "gemini",
      message: "Gemini API request was invalid or malformed."
    };
  }

  return {
    type: "GEMINI_UNKNOWN_ERROR",
    retryable: false,
    status: status || 500,
    provider: "gemini",
    message: "An unknown error occurred while communicating with Gemini API."
  };
};

const executeWithRetry = async (fn) => {
  const MAX_RETRIES = 2;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      if (attempt === 0) {
        console.log('[GEMINI] request started');
      } else {
        console.log(`[GEMINI] retry attempt ${attempt}`);
      }
      const result = await fn();
      console.log('[GEMINI] request succeeded');
      return result;
    } catch (error) {
      const classification = classifyGeminiError(error);
      console.log('[GEMINI] request failed');
      console.log(`[GEMINI] error classified: ${classification.type}`);

      if (!classification.retryable) {
        console.log(`[GEMINI] retry skipped: non-retryable error (${classification.type})`);
        throw classification;
      }
      if (attempt === MAX_RETRIES) {
        console.log(`[GEMINI] retry exhausted`);
        throw classification;
      }
      
      const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }
};

module.exports = {
  classifyGeminiError,
  executeWithRetry
};
