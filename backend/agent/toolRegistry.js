class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  registerTool(tool) {
    if (!tool.name || typeof tool.execute !== 'function') {
      throw new Error('Tool must have a valid name and an execute function.');
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAvailableTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema || {}
    }));
  }

  async executeTool(name, input, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found in registry: ${name}`);
    }
    
    // Strict context object definition
    const controlledContext = {
      sessionId: context.sessionId || null,
      activeComparisonList: context.activeComparisonList || [],
      currentProduct: context.currentProduct || null,
      userPreferences: context.userPreferences || null,
      retrievedProducts: context.retrievedProducts || []
    };

    return await tool.execute(input, controlledContext);
  }
}

module.exports = new ToolRegistry();
