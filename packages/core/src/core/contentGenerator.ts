/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import type { Config } from '../config/config.js';

import type { UserTierId } from '../code_assist/types.js';
import { LoggingContentGenerator } from './loggingContentGenerator.js';
import { InstallationManager } from '../utils/installationManager.js';
import { createLocalContentGenerator } from '../llm/LocalContentGenerator.js';
import type { LocalLLMConfig } from '../llm/LocalLLMAdapter.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  LOCAL_LLM = 'local-llm',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  proxy?: string | undefined;
  // Local LLM specific configuration
  localLLM?: {
    provider: 'ollama' | 'llamafile' | 'lmstudio' | 'custom';
    host?: string;
    port?: number;
    timeout?: number;
    maxRetries?: number;
    temperature?: number;
    maxTokens?: number;
    contextSize?: number;
  };
};

export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  const geminiApiKey = process.env['GEMINI_API_KEY'] || undefined;
  const googleApiKey = process.env['GOOGLE_API_KEY'] || undefined;
  const googleCloudProject = process.env['GOOGLE_CLOUD_PROJECT'] || undefined;
  const googleCloudLocation = process.env['GOOGLE_CLOUD_LOCATION'] || undefined;

  // Use the base model from config to avoid circular dependency during initialization
  const effectiveModel = config.getBaseModel();

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  // Local LLM configuration
  if (authType === AuthType.LOCAL_LLM) {
    const localLLMHost = process.env['LOCAL_LLM_HOST'] || 'localhost';
    const localLLMPort = parseInt(process.env['LOCAL_LLM_PORT'] || '11434', 10);
    const localLLMProvider = (process.env['LOCAL_LLM_PROVIDER'] || 'ollama') as 'ollama' | 'llamafile' | 'lmstudio' | 'custom';
    
    contentGeneratorConfig.localLLM = {
      provider: localLLMProvider,
      host: localLLMHost,
      port: localLLMPort,
      timeout: parseInt(process.env['LOCAL_LLM_TIMEOUT'] || '60000', 10),
      maxRetries: parseInt(process.env['LOCAL_LLM_MAX_RETRIES'] || '3', 10),
      temperature: parseFloat(process.env['LOCAL_LLM_TEMPERATURE'] || '0.7'),
      maxTokens: parseInt(process.env['LOCAL_LLM_MAX_TOKENS'] || '2048', 10),
      contextSize: parseInt(process.env['LOCAL_LLM_CONTEXT_SIZE'] || '4096', 10),
    };

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env['CLI_VERSION'] || process.version;
  const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;
  const baseHeaders: Record<string, string> = {
    'User-Agent': userAgent,
  };

  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    const httpOptions = { headers: baseHeaders };
    return new LoggingContentGenerator(
      await createCodeAssistContentGenerator(
        httpOptions,
        config.authType,
        gcConfig,
        sessionId,
      ),
      gcConfig,
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    let headers: Record<string, string> = { ...baseHeaders };
    if (gcConfig?.getUsageStatisticsEnabled()) {
      const installationManager = new InstallationManager();
      const installationId = installationManager.getInstallationId();
      headers = {
        ...headers,
        'x-gemini-api-privileged-user-id': `${installationId}`,
      };
    }
    const httpOptions = { headers };

    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
    return new LoggingContentGenerator(googleGenAI.models, gcConfig);
  }

  if (config.authType === AuthType.LOCAL_LLM) {
    if (!config.localLLM) {
      throw new Error('Local LLM configuration is required when using LOCAL_LLM auth type');
    }

    const localLLMConfig: LocalLLMConfig = {
      provider: config.localLLM.provider,
      host: config.localLLM.host || 'localhost',
      port: config.localLLM.port || 11434,
      model: config.model,
      timeout: config.localLLM.timeout || 60000,
      maxRetries: config.localLLM.maxRetries || 3,
      temperature: config.localLLM.temperature || 0.7,
      maxTokens: config.localLLM.maxTokens || 2048,
      contextSize: config.localLLM.contextSize || 4096,
    };

    return new LoggingContentGenerator(
      createLocalContentGenerator(localLLMConfig),
      gcConfig
    );
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
