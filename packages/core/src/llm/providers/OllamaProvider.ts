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
  Content,
} from '@google/genai';
import {
  LocalLLMAdapter,
  type LocalLLMConfig,
  type LocalModelInfo,
  type LocalLLMStreamChunk,
  LocalLLMNotAvailableError,
  ModelNotAvailableError,
} from '../LocalLLMAdapter.js';

/**
 * Ollama API response types
 */
interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_ctx?: number;
    num_predict?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Ollama provider for local LLM inference
 */
export class OllamaProvider extends LocalLLMAdapter {
  constructor(config: Partial<LocalLLMConfig> = {}) {
    const defaultConfig: LocalLLMConfig = {
      provider: 'ollama',
      host: 'localhost',
      port: 11434,
      model: 'llama3.1',
      timeout: 60000, // Increase timeout for local inference
      maxRetries: 3,
      temperature: 0.7,
      maxTokens: 2048,
      contextSize: 4096,
      ...config,
    };
    super(defaultConfig);
  }

  /**
   * Check if Ollama is available and running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest(this.getEndpointUrl('/api/tags'));
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<LocalModelInfo[]> {
    try {
      const response = await this.makeRequest(this.getEndpointUrl('/api/tags'));
      
      if (!response.ok) {
        throw new LocalLLMNotAvailableError(
          this.config.provider,
          this.config.host,
          this.config.port
        );
      }

      const data: OllamaListResponse = await response.json();
      
      return data.models.map((model: OllamaModel): LocalModelInfo => ({
        name: model.name,
        size: this.formatBytes(model.size),
        digest: model.digest,
        modified: model.modified_at,
        details: model.details,
      }));
    } catch (error) {
      if (error instanceof LocalLLMNotAvailableError) {
        throw error;
      }
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pull/download a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await this.makeRequest(
        this.getEndpointUrl('/api/pull'),
        {
          method: 'POST',
          body: JSON.stringify({ name: modelName }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to pull model ${modelName}: ${response.statusText}`);
      }

      // For streaming progress, we could implement progress tracking here
      const reader = response.body?.getReader();
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          
          if (value) {
            const chunk = new TextDecoder().decode(value);
            try {
              const progress = JSON.parse(chunk);
              if (progress.status) {
                console.log(`Pulling ${modelName}: ${progress.status}`);
              }
            } catch {
              // Ignore JSON parse errors for progress updates
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to pull model ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content using Ollama
   */
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    await this.ensureModelAvailable();

    // Handle both Content[] and PartUnion[] formats
    let contents: Content[];
    if (Array.isArray(request.contents)) {
      if (typeof request.contents[0] === 'string') {
        // PartUnion[] format - convert to Content
        contents = [{ role: 'user', parts: request.contents.map(c => ({ text: c })) as any[] }];
      } else {
        // Already Content[] format
        contents = request.contents as Content[];
      }
    } else {
      // Single content
      contents = [request.contents as Content];
    }
    
    // Include system instruction if present
    const allContents = [...contents];
    if (request.config?.systemInstruction) {
      // systemInstruction can be a string, Content, or array - convert to Content format
      let systemContent: Content;
      if (typeof request.config.systemInstruction === 'string') {
        systemContent = {
          role: 'system' as const,
          parts: [{ text: request.config.systemInstruction }]
        };
      } else if (Array.isArray(request.config.systemInstruction)) {
        systemContent = {
          role: 'system' as const,
          parts: request.config.systemInstruction.map(part => 
            typeof part === 'string' ? { text: part } : part
          )
        };
      } else if ('parts' in request.config.systemInstruction) {
        // It's a Content object
        systemContent = {
          role: 'system' as const,
          parts: request.config.systemInstruction.parts || []
        };
      } else {
        // It's a single Part
        systemContent = {
          role: 'system' as const,
          parts: [request.config.systemInstruction as any] // Part type
        };
      }
      allContents.unshift(systemContent);
    }
    
    const messages = this.convertToLocalFormat(allContents);
    const ollamaRequest: OllamaChatRequest = {
      model: this.config.model,
      messages,
      stream: false,
      options: {
        temperature: request.config?.temperature ?? this.config.temperature,
        num_ctx: this.config.contextSize,
        num_predict: this.config.maxTokens,
      },
    };

    try {
      const response = await this.makeRequest(
        this.getEndpointUrl('/api/chat'),
        {
          method: 'POST',
          body: JSON.stringify(ollamaRequest),
        }
      );

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const data: OllamaChatResponse = await response.json();
      return this.convertFromLocalFormat(data);
    } catch (error) {
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate streaming content using Ollama
   */
  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    await this.ensureModelAvailable();

    // Handle both Content[] and PartUnion[] formats
    let contents: Content[];
    if (Array.isArray(request.contents)) {
      if (typeof request.contents[0] === 'string') {
        // PartUnion[] format - convert to Content
        contents = [{ role: 'user', parts: request.contents.map(c => ({ text: c })) as any[] }];
      } else {
        // Already Content[] format
        contents = request.contents as Content[];
      }
    } else {
      // Single content
      contents = [request.contents as Content];
    }
    
    // Include system instruction if present
    const allContents = [...contents];
    if (request.config?.systemInstruction) {
      // systemInstruction can be a string, Content, or array - convert to Content format
      let systemContent: Content;
      if (typeof request.config.systemInstruction === 'string') {
        systemContent = {
          role: 'system' as const,
          parts: [{ text: request.config.systemInstruction }]
        };
      } else if (Array.isArray(request.config.systemInstruction)) {
        systemContent = {
          role: 'system' as const,
          parts: request.config.systemInstruction.map(part => 
            typeof part === 'string' ? { text: part } : part
          )
        };
      } else if ('parts' in request.config.systemInstruction) {
        // It's a Content object
        systemContent = {
          role: 'system' as const,
          parts: request.config.systemInstruction.parts || []
        };
      } else {
        // It's a single Part
        systemContent = {
          role: 'system' as const,
          parts: [request.config.systemInstruction as any] // Part type
        };
      }
      allContents.unshift(systemContent);
    }
    
    const messages = this.convertToLocalFormat(allContents);
    const ollamaRequest: OllamaChatRequest = {
      model: this.config.model,
      messages,
      stream: true,
      options: {
        temperature: request.config?.temperature ?? this.config.temperature,
        num_ctx: this.config.contextSize,
        num_predict: this.config.maxTokens,
      },
    };

    const response = await this.makeRequest(
      this.getEndpointUrl('/api/chat'),
      {
        method: 'POST',
        body: JSON.stringify(ollamaRequest),
      }
    );

    if (!response.ok) {
      throw new Error(`Ollama streaming request failed: ${response.statusText}`);
    }

    return this.processStreamResponse(response);
  }

  /**
   * Count tokens (approximate, since Ollama doesn't provide exact token counting)
   */
  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Ollama doesn't provide native token counting, so we approximate
    const contents = Array.isArray(request.contents) ? request.contents : [request.contents as Content];
    const text = contents
      .map((content: Content) => content.parts?.map((part: any) => ('text' in part ? part.text : '')).join(' '))
      .join(' ');
    
    // Rough approximation: 1 token ≈ 4 characters for English text
    const estimatedTokens = Math.ceil(text.length / 4);
    
    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * Generate embeddings using Ollama
   */
  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    // Check if we have an embedding model configured
    const embeddingModel = this.config.model.includes('embed') ? this.config.model : 'nomic-embed-text';
    
    const embeddings: number[][] = [];
    
    const contents = Array.isArray(request.contents) ? request.contents : [request.contents as string];
    for (const content of contents) {
      const ollamaRequest: OllamaEmbeddingRequest = {
        model: embeddingModel,
        prompt: typeof content === 'string' ? content : content.toString(),
      };

      try {
        const response = await this.makeRequest(
          this.getEndpointUrl('/api/embeddings'),
          {
            method: 'POST',
            body: JSON.stringify(ollamaRequest),
          }
        );

        if (!response.ok) {
          throw new Error(`Embedding request failed: ${response.statusText}`);
        }

        const data: OllamaEmbeddingResponse = await response.json();
        embeddings.push(data.embedding);
      } catch (error) {
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { 
      embeddings: embeddings.map(embedding => ({ values: embedding })) 
    };
  }

  /**
   * Process streaming response from Ollama
   */
  private async *processStreamResponse(response: Response): AsyncGenerator<GenerateContentResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk: LocalLLMStreamChunk = JSON.parse(line);
              yield this.convertFromLocalFormat(chunk);
              
              if (chunk.done) {
                return;
              }
            } catch (error) {
              console.warn('Failed to parse streaming chunk:', line, error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Ensure the configured model is available, pull if necessary
   */
  private async ensureModelAvailable(): Promise<void> {
    const models = await this.listModels();
    const availableModelNames = models.map(model => model.name);
    
    if (!availableModelNames.some(name => name.startsWith(this.config.model))) {
      console.log(`Model ${this.config.model} not found locally, attempting to pull...`);
      try {
        await this.pullModel(this.config.model);
        console.log(`Successfully pulled model ${this.config.model}`);
      } catch (error) {
        throw new ModelNotAvailableError(this.config.model, availableModelNames);
      }
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Helper function to create Ollama provider with common configurations
 */
export function createOllamaProvider(config?: Partial<LocalLLMConfig>): OllamaProvider {
  return new OllamaProvider(config);
}

/**
 * Common Ollama model configurations
 */
export const OLLAMA_MODELS = {
  // Code-focused models
  CODELLAMA: 'codellama:13b-instruct',
  DEEPSEEK_CODER: 'deepseek-coder:6.7b-instruct',
  CODEGEMMA: 'codegemma:7b-instruct',
  
  // General purpose models
  LLAMA3_1: 'llama3.1:8b-instruct',
  LLAMA3_1_LARGE: 'llama3.1:70b-instruct',
  MISTRAL: 'mistral:7b-instruct',
  MIXTRAL: 'mixtral:8x7b-instruct',
  
  // Lightweight models for faster response
  TINYLLAMA: 'tinyllama:1.1b',
  PHI3: 'phi3:3.8b-mini-instruct',
  
  // Embedding models
  NOMIC_EMBED: 'nomic-embed-text',
  ALL_MINILM: 'all-minilm:33m',
} as const;
