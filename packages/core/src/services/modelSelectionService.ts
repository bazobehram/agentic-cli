/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  analyzeTaskType,
  recommendModel,
  MODEL_CATALOG,
} from '../config/modelCatalog.js';
import type {
  ModelCapabilities,
  TaskType,
} from '../config/modelCatalog.js';

export interface ModelSelectionContext {
  /** The user's prompt/query */
  prompt: string;
  /** Project-related context */
  projectContext?: {
    hasCodeFiles: boolean;
    primaryLanguage?: string;
    projectType?: string;
    fileTypes?: string[];
  };
  /** User preferences */
  userPreferences?: {
    mode: 'auto' | 'manual';
    preferredModel?: string;
    allowFallback?: boolean;
    showRecommendations?: boolean;
  };
  /** Currently available models */
  availableModels?: string[];
}

export interface ModelRecommendation {
  /** The recommended model */
  model: ModelCapabilities;
  /** The detected task type */
  taskType: TaskType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the recommendation */
  reasoning: string;
  /** Alternative models that could also work */
  alternatives: ModelCapabilities[];
}

export class ModelSelectionService {
  /**
   * Analyzes the context and provides a model recommendation
   */
  public static recommend(context: ModelSelectionContext): ModelRecommendation {
    const taskType = analyzeTaskType(context.prompt, context.projectContext);
    const availableModels = context.availableModels || MODEL_CATALOG.map(m => m.name);
    
    // If user has manual mode and preferred model, use that
    if (
      context.userPreferences?.mode === 'manual' &&
      context.userPreferences.preferredModel &&
      availableModels.includes(context.userPreferences.preferredModel)
    ) {
      const preferredModel = MODEL_CATALOG.find(
        m => m.name === context.userPreferences!.preferredModel
      );
      if (preferredModel) {
        return {
          model: preferredModel,
          taskType,
          confidence: 1.0,
          reasoning: `Using your preferred model: ${preferredModel.displayName}`,
          alternatives: this.getAlternatives(preferredModel, taskType, availableModels),
        };
      }
    }

    // Auto-select best model for task
    const recommendedModel = recommendModel(taskType, availableModels);
    if (!recommendedModel) {
      // Fallback to first available model
      const fallbackModel = MODEL_CATALOG.find(m => availableModels.includes(m.name));
      if (!fallbackModel) {
        throw new Error('No available models found');
      }
      
      return {
        model: fallbackModel,
        taskType,
        confidence: 0.3,
        reasoning: `No optimal model found for ${taskType}. Using fallback: ${fallbackModel.displayName}`,
        alternatives: [],
      };
    }

    const reasoning = this.generateReasoning(recommendedModel, taskType, context);
    const alternatives = this.getAlternatives(recommendedModel, taskType, availableModels);
    const confidence = this.calculateConfidence(recommendedModel, taskType, context);

    return {
      model: recommendedModel,
      taskType,
      confidence,
      reasoning,
      alternatives,
    };
  }

  /**
   * Gets performance characteristics for a model by name or display name
   */
  public static getModelInfo(modelName: string): ModelCapabilities | null {
    if (!modelName) return null;
    
    // First try exact match by name
    let model = MODEL_CATALOG.find(m => m.name === modelName);
    if (model) return model;
    
    // Then try exact match by display name (case insensitive)
    model = MODEL_CATALOG.find(m => 
      m.displayName.toLowerCase() === modelName.toLowerCase()
    );
    if (model) return model;
    
    // Try partial matching for display names (fuzzy match)
    model = MODEL_CATALOG.find(m => {
      const displayLower = m.displayName.toLowerCase();
      const inputLower = modelName.toLowerCase();
      return displayLower.includes(inputLower) || inputLower.includes(displayLower);
    });
    if (model) return model;
    
    // Try partial matching for model names
    model = MODEL_CATALOG.find(m => {
      const nameLower = m.name.toLowerCase();
      const inputLower = modelName.toLowerCase();
      // Match base name without tags (e.g., "gpt-oss" matches "gpt-oss:latest")
      const baseName = nameLower.split(':')[0];
      return baseName === inputLower || nameLower.startsWith(inputLower);
    });
    
    return model || null;
  }

  /**
   * Gets all available model information
   */
  public static getAllModels(): ModelCapabilities[] {
    return MODEL_CATALOG;
  }

  /**
   * Validates if a model exists in actual Ollama installation
   */
  public static async validateModelWithOllama(modelName: string): Promise<{
    isValid: boolean;
    actualModelName?: string;
    availableModels?: string[];
    error?: string;
  }> {
    try {
      // Import OllamaProvider dynamically to avoid circular dependency
      const { OllamaProvider } = await import('../llm/providers/OllamaProvider.js');
      
      const provider = new OllamaProvider({ provider: 'ollama', host: 'localhost', port: 11434, model: '' });
      
      // Check if Ollama is running
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        return {
          isValid: false,
          error: 'Ollama is not running. Please start Ollama service first.'
        };
      }

      // Get list of installed models
      const models = await provider.listModels();
      const availableNames = models.map(m => m.name);
      
      // Try exact match first
      if (availableNames.includes(modelName)) {
        return { isValid: true, actualModelName: modelName, availableModels: availableNames };
      }
      
      // Try to find a model that starts with the given name (for cases like "gpt-oss" matching "gpt-oss:latest")
      const matchingModel = availableNames.find(name => 
        name.startsWith(modelName) || name.startsWith(modelName.toLowerCase())
      );
      
      if (matchingModel) {
        return { isValid: true, actualModelName: matchingModel, availableModels: availableNames };
      }
      
      return {
        isValid: false,
        availableModels: availableNames,
        error: `Model "${modelName}" not found in Ollama. Available models: ${availableNames.join(', ')}`
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate model with Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Determines if a model switch would be beneficial
   */
  public static shouldSwitchModel(
    currentModel: string,
    context: ModelSelectionContext
  ): { shouldSwitch: boolean; reason?: string; recommendedModel?: ModelCapabilities } {
    const recommendation = this.recommend(context);
    
    if (recommendation.model.name === currentModel) {
      return { shouldSwitch: false };
    }

    // Only suggest switching if confidence is high and there's a significant benefit
    if (recommendation.confidence > 0.7) {
      const currentModelInfo = this.getModelInfo(currentModel);
      const newModelInfo = recommendation.model;
      
      // Check if the new model is significantly better for this task
      const currentScore = currentModelInfo 
        ? this.scoreModelForTask(currentModelInfo, recommendation.taskType)
        : 0;
      const newScore = this.scoreModelForTask(newModelInfo, recommendation.taskType);
      
      if (newScore > currentScore + 2) { // Significant improvement threshold
        return {
          shouldSwitch: true,
          reason: `${newModelInfo.displayName} would be better for ${recommendation.taskType}: ${recommendation.reasoning}`,
          recommendedModel: newModelInfo,
        };
      }
    }

    return { shouldSwitch: false };
  }

  /**
   * Gets alternative models for a given task
   */
  private static getAlternatives(
    selectedModel: ModelCapabilities,
    taskType: TaskType,
    availableModels: string[]
  ): ModelCapabilities[] {
    return MODEL_CATALOG
      .filter(m => 
        m.name !== selectedModel.name && 
        availableModels.includes(m.name)
      )
      .map(model => ({
        model,
        score: this.scoreModelForTask(model, taskType),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2) // Top 2 alternatives
      .map(item => item.model);
  }

  /**
   * Generates human-readable reasoning for model selection
   */
  private static generateReasoning(
    model: ModelCapabilities,
    taskType: TaskType,
    context: ModelSelectionContext
  ): string {
    const reasons: string[] = [];

    // Task-specific reasoning
    switch (taskType) {
      case 'code_generation':
      case 'debugging':
        if (model.strengths.includes('coding')) {
          reasons.push(`${model.displayName} excels at coding tasks`);
        }
        break;
      case 'quick_questions':
        if (model.performance.speed === 'fast') {
          reasons.push(`${model.displayName} provides fast responses for quick queries`);
        }
        break;
      case 'complex_reasoning':
      case 'project_planning':
        if (model.performance.quality === 'excellent') {
          reasons.push(`${model.displayName} offers excellent quality for complex reasoning`);
        }
        break;
      case 'creative_writing':
        if (model.strengths.includes('creative')) {
          reasons.push(`${model.displayName} is designed for creative tasks`);
        }
        break;
    }

    // Performance characteristics
    if (model.performance.speed === 'fast' && context.prompt.length < 100) {
      reasons.push('optimized for quick responses');
    }
    
    if (model.performance.memoryUsage === 'low') {
      reasons.push('efficient memory usage');
    }

    // Project context
    if (context.projectContext?.hasCodeFiles && model.strengths.includes('coding')) {
      reasons.push('well-suited for code projects');
    }

    return reasons.length > 0 
      ? reasons.join(', ')
      : `${model.displayName} is a good general-purpose choice`;
  }

  /**
   * Calculates confidence score for a recommendation
   */
  private static calculateConfidence(
    model: ModelCapabilities,
    taskType: TaskType,
    context: ModelSelectionContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for strength matches
    const taskPreferences = this.getTaskPreferences(taskType);
    if (taskPreferences.strengths) {
      const matchingStrengths = model.strengths.filter(strength =>
        taskPreferences.strengths!.includes(strength)
      ).length;
      confidence += matchingStrengths * 0.15;
    }

    // Increase confidence for performance matches
    if (taskPreferences.performance) {
      if (taskPreferences.performance.quality === model.performance.quality) {
        confidence += 0.1;
      }
      if (taskPreferences.performance.speed === model.performance.speed) {
        confidence += 0.05;
      }
    }

    // Adjust for project context
    if (context.projectContext?.hasCodeFiles && model.strengths.includes('coding')) {
      confidence += 0.1;
    }

    // Adjust for prompt complexity
    if (context.prompt.length > 500 && model.performance.quality === 'excellent') {
      confidence += 0.1;
    } else if (context.prompt.length < 100 && model.performance.speed === 'fast') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Scores a model for a specific task type
   */
  private static scoreModelForTask(model: ModelCapabilities, taskType: TaskType): number {
    const preferences = this.getTaskPreferences(taskType);
    let score = 0;

    // Check strength alignment
    if (preferences.strengths) {
      const matchingStrengths = model.strengths.filter(strength =>
        preferences.strengths!.includes(strength)
      ).length;
      score += matchingStrengths * 3;
    }

    // Check performance requirements
    if (preferences.performance?.quality) {
      const qualityMatch = preferences.performance.quality === model.performance.quality;
      score += qualityMatch ? 2 : 0;
    }

    if (preferences.performance?.speed) {
      const speedMatch = preferences.performance.speed === model.performance.speed;
      score += speedMatch ? 1 : 0;
    }

    return score;
  }

  /**
   * Gets task preferences (duplicated from modelCatalog for encapsulation)
   */
  private static getTaskPreferences(taskType: TaskType): Partial<ModelCapabilities> {
    const preferences: Record<TaskType, Partial<ModelCapabilities>> = {
      code_generation: {
        strengths: ['coding'],
        performance: { speed: 'medium', quality: 'excellent', memoryUsage: 'medium' },
      },
      code_review: {
        strengths: ['coding', 'analysis'],
        performance: { speed: 'medium', quality: 'good', memoryUsage: 'medium' },
      },
      debugging: {
        strengths: ['coding', 'reasoning'],
        performance: { speed: 'medium', quality: 'excellent', memoryUsage: 'medium' },
      },
      documentation: {
        strengths: ['general', 'coding'],
        performance: { speed: 'medium', quality: 'good', memoryUsage: 'medium' },
      },
      general_chat: {
        strengths: ['general', 'conversation'],
        performance: { speed: 'fast', quality: 'good', memoryUsage: 'low' },
      },
      file_analysis: {
        strengths: ['analysis', 'coding'],
        performance: { speed: 'medium', quality: 'good', memoryUsage: 'medium' },
      },
      project_planning: {
        strengths: ['reasoning', 'general'],
        performance: { speed: 'medium', quality: 'excellent', memoryUsage: 'medium' },
      },
      quick_questions: {
        strengths: ['lightweight'],
        performance: { speed: 'fast', quality: 'basic', memoryUsage: 'low' },
      },
      complex_reasoning: {
        strengths: ['reasoning', 'math'],
        performance: { speed: 'slow', quality: 'excellent', memoryUsage: 'high' },
      },
      creative_writing: {
        strengths: ['creative', 'general'],
        performance: { speed: 'medium', quality: 'excellent', memoryUsage: 'medium' },
      },
    };

    return preferences[taskType] || {};
  }
}
