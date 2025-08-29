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
  Part,
} from '@google/genai';
import { FinishReason } from '@google/genai';

/**
 * Configuration for local LLM providers
 */
export interface LocalLLMConfig {
  provider: 'ollama' | 'llamafile' | 'lmstudio' | 'custom';
  host: string;
  port: number;
  model: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
  contextSize?: number;
}

/**
 * Response from local LLM model listing
 */
export interface LocalModelInfo {
  name: string;
  size: string;
  digest: string;
  modified: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Local LLM streaming response chunk
 */
export interface LocalLLMStreamChunk {
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

/**
 * Abstract interface for local LLM providers
 */
export abstract class LocalLLMAdapter {
  protected config: LocalLLMConfig;

  constructor(config: LocalLLMConfig) {
    this.config = config;
  }

  /**
   * Check if the LLM provider is available and running
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * List available models
   */
  abstract listModels(): Promise<LocalModelInfo[]>;

  /**
   * Pull/download a model if not available locally
   */
  abstract pullModel(modelName: string): Promise<void>;

  /**
   * Generate content using the local LLM
   */
  abstract generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  /**
   * Generate content stream using the local LLM
   */
  abstract generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  /**
   * Count tokens for given content (if supported)
   */
  abstract countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse>;

  /**
   * Generate embeddings (if supported)
   */
  abstract embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse>;

  /**
   * Convert Gemini API format to local LLM format
   */
  protected convertToLocalFormat(contents: Content[]): any[] {
    return contents.map(content => ({
      role: content.role === 'model' ? 'assistant' : content.role,
      content: this.extractTextFromParts(content.parts || []),
    }));
  }

  /**
   * Convert local LLM response to Gemini API format
   */
  protected convertFromLocalFormat(response: any): GenerateContentResponse {
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: response.message?.content || response.content || '' }],
          },
          finishReason: response.done ? FinishReason.STOP : undefined,
        },
      ],
      usageMetadata: response.prompt_eval_count
        ? {
            promptTokenCount: response.prompt_eval_count,
            candidatesTokenCount: response.eval_count,
            totalTokenCount: (response.prompt_eval_count || 0) + (response.eval_count || 0),
          }
        : undefined,
      // Required properties for GenerateContentResponse
      text: undefined,
      data: undefined,
      functionCalls: undefined,
      executableCode: undefined,
      codeExecutionResult: undefined,
    };
  }

  /**
   * Extract text content from Gemini API parts
   */
  private extractTextFromParts(parts: Part[]): string {
    return parts
      .map(part => {
        if ('text' in part) {
          return part.text;
        } else if ('functionCall' in part) {
          return `[Function Call: ${part.functionCall?.name}]`;
        } else if ('functionResponse' in part) {
          return `[Function Response: ${part.functionResponse?.name}]`;
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  /**
   * Get current configuration
   */
  getConfig(): LocalLLMConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LocalLLMConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get provider endpoint URL
   */
  protected getEndpointUrl(path: string = ''): string {
    const protocol = this.config.host.startsWith('http') ? '' : 'http://';
    const baseUrl = `${protocol}${this.config.host}:${this.config.port}`;
    return path ? `${baseUrl}${path}` : baseUrl;
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async makeRequest(
    url: string,
    options: RequestInit = {},
    retries: number = this.config.maxRetries || 3,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok && retries > 0) {
        console.warn(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequest(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(`Request error, retrying... (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequest(url, options, retries - 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Error thrown when local LLM provider is not available
 */
export class LocalLLMNotAvailableError extends Error {
  constructor(provider: string, host: string, port: number) {
    super(`Local LLM provider ${provider} not available at ${host}:${port}`);
    this.name = 'LocalLLMNotAvailableError';
  }
}

/**
 * Error thrown when requested model is not available
 */
export class ModelNotAvailableError extends Error {
  constructor(modelName: string, availableModels: string[]) {
    super(
      `Model "${modelName}" not available. Available models: ${availableModels.join(', ')}`
    );
    this.name = 'ModelNotAvailableError';
  }
}
