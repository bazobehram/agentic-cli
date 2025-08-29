/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensResponse,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import type { ContentGenerator } from '../core/contentGenerator.js';
import type { UserTierId } from '../code_assist/types.js';
import { LocalLLMAdapter, type LocalLLMConfig } from './LocalLLMAdapter.js';
import { OllamaProvider } from './providers/OllamaProvider.js';

/**
 * Content generator that uses local LLM providers instead of Google APIs
 */
export class LocalContentGenerator implements ContentGenerator {
  private adapter: LocalLLMAdapter;
  public readonly userTier: UserTierId = 'free-tier' as UserTierId; // Local LLMs are always free

  constructor(config: LocalLLMConfig) {
    // Factory pattern to create appropriate adapter based on provider
    switch (config.provider) {
      case 'ollama':
        this.adapter = new OllamaProvider(config);
        break;
      case 'llamafile':
        // Future implementation
        throw new Error('Llamafile provider not yet implemented');
      case 'lmstudio':
        // Future implementation
        throw new Error('LM Studio provider not yet implemented');
      case 'custom':
        // Future implementation for custom providers
        throw new Error('Custom provider not yet implemented');
      default:
        throw new Error(`Unsupported local LLM provider: ${config.provider}`);
    }
  }

  /**
   * Generate content using the local LLM
   */
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    return this.adapter.generateContent(request, userPromptId);
  }

  /**
   * Generate streaming content using the local LLM
   */
  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.adapter.generateContentStream(request, userPromptId);
  }

  /**
   * Count tokens for the given content
   */
  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    return this.adapter.countTokens(request);
  }

  /**
   * Generate embeddings for the given content
   */
  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    return this.adapter.embedContent(request);
  }

  /**
   * Check if the local LLM provider is available
   */
  async isAvailable(): Promise<boolean> {
    return this.adapter.isAvailable();
  }

  /**
   * Get information about available models
   */
  async getAvailableModels() {
    return this.adapter.listModels();
  }

  /**
   * Pull/download a model if not available
   */
  async ensureModel(modelName: string): Promise<void> {
    return this.adapter.pullModel(modelName);
  }

  /**
   * Get current adapter configuration
   */
  getConfig(): LocalLLMConfig {
    return this.adapter.getConfig();
  }

  /**
   * Update adapter configuration
   */
  updateConfig(updates: Partial<LocalLLMConfig>): void {
    this.adapter.updateConfig(updates);
  }
}

/**
 * Factory function to create a local content generator
 */
export function createLocalContentGenerator(config: LocalLLMConfig): LocalContentGenerator {
  return new LocalContentGenerator(config);
}

/**
 * Helper to create common local LLM configurations
 */
export const LOCAL_LLM_CONFIGS = {
  /**
   * Default Ollama configuration with a code-focused model
   */
  OLLAMA_CODER: {
    provider: 'ollama' as const,
    host: 'localhost',
    port: 11434,
    model: 'deepseek-coder:6.7b-instruct',
    temperature: 0.1, // Lower temperature for code generation
    maxTokens: 4096,
    contextSize: 8192,
  },

  /**
   * Ollama configuration with a general-purpose model
   */
  OLLAMA_GENERAL: {
    provider: 'ollama' as const,
    host: 'localhost',
    port: 11434,
    model: 'llama3.1:8b-instruct',
    temperature: 0.7,
    maxTokens: 2048,
    contextSize: 4096,
  },

  /**
   * Fast response configuration with a lightweight model
   */
  OLLAMA_FAST: {
    provider: 'ollama' as const,
    host: 'localhost',
    port: 11434,
    model: 'phi3:3.8b-mini-instruct',
    temperature: 0.5,
    maxTokens: 1024,
    contextSize: 2048,
    timeout: 15000, // Shorter timeout for fast responses
  },

  /**
   * High-quality configuration with a larger model
   */
  OLLAMA_QUALITY: {
    provider: 'ollama' as const,
    host: 'localhost',
    port: 11434,
    model: 'llama3.1:70b-instruct',
    temperature: 0.3,
    maxTokens: 8192,
    contextSize: 16384,
    timeout: 120000, // Longer timeout for large models
  },
} as const;

/**
 * Utility to detect and validate local LLM setup
 */
export class LocalLLMSetupValidator {
  /**
   * Check if Ollama is installed and running
   */
  static async validateOllama(host: string = 'localhost', port: number = 11434): Promise<{
    available: boolean;
    error?: string;
    models?: string[];
  }> {
    try {
      const adapter = new OllamaProvider({ provider: 'ollama', host, port, model: '' });
      
      const isAvailable = await adapter.isAvailable();
      if (!isAvailable) {
        return {
          available: false,
          error: `Ollama not running at ${host}:${port}. Please install and start Ollama.`,
        };
      }

      const models = await adapter.listModels();
      return {
        available: true,
        models: models.map(m => m.name),
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error validating Ollama',
      };
    }
  }

  /**
   * Suggest optimal model based on system resources
   */
  static suggestModel(): string {
    // Simple heuristic based on available memory
    // In a real implementation, we'd check system specs
    const totalMemory = process.memoryUsage().heapTotal;
    
    if (totalMemory > 16 * 1024 * 1024 * 1024) { // > 16GB
      return 'llama3.1:70b-instruct'; // High-quality model
    } else if (totalMemory > 8 * 1024 * 1024 * 1024) { // > 8GB
      return 'llama3.1:8b-instruct'; // Balanced model
    } else {
      return 'phi3:3.8b-mini-instruct'; // Lightweight model
    }
  }

  /**
   * Create setup instructions for users
   */
  static getSetupInstructions(): string {
    return `
🚀 Setting up Local LLM Support

agentic-cli now supports local LLMs for complete privacy and offline usage!

## Quick Setup:

1. **Install Ollama:**
   - macOS/Linux: curl -fsSL https://ollama.com/install.sh | sh
   - Windows: Download from https://ollama.com/download

2. **Start Ollama service:**
   - Run: ollama serve

3. **Pull a model:**
   - For coding: ollama pull deepseek-coder:6.7b-instruct
   - General use: ollama pull llama3.1:8b-instruct
   - Fast/lightweight: ollama pull phi3:3.8b-mini-instruct

4. **Configure agentic-cli:**
   - Run: agentic-cli
   - Select "Local LLM" as your provider
   - Choose your installed model

## Benefits:
✅ Complete privacy - no data sent to external services
✅ No API costs or rate limits
✅ Works offline
✅ Full control over your models

Need help? Check our documentation at: docs/local-llm-setup.md
    `.trim();
  }
}
