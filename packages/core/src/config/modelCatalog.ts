/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelCapabilities {
  /** Model name as it appears in Ollama */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Model size in GB (approximate) */
  sizeGB: number;
  /** Performance characteristics */
  performance: {
    speed: 'fast' | 'medium' | 'slow';
    quality: 'basic' | 'good' | 'excellent';
    memoryUsage: 'low' | 'medium' | 'high';
  };
  /** What this model excels at */
  strengths: ModelStrength[];
  /** Brief description */
  description: string;
  /** Recommended use cases */
  useCases: string[];
}

export type ModelStrength = 
  | 'coding'
  | 'general'
  | 'lightweight'
  | 'math'
  | 'reasoning'
  | 'conversation'
  | 'analysis'
  | 'creative'
  | 'multilingual';

export type TaskType =
  | 'code_generation'
  | 'code_review'
  | 'debugging'
  | 'documentation'
  | 'general_chat'
  | 'file_analysis'
  | 'project_planning'
  | 'quick_questions'
  | 'complex_reasoning'
  | 'creative_writing';

export const MODEL_CATALOG: ModelCapabilities[] = [
  {
    name: 'qwen3-coder:latest',
    displayName: 'Qwen3 Coder',
    sizeGB: 18,
    performance: {
      speed: 'medium',
      quality: 'excellent',
      memoryUsage: 'high',
    },
    strengths: ['coding', 'analysis', 'reasoning'],
    description: 'Specialized coding model with excellent programming capabilities',
    useCases: [
      'Code generation and refactoring',
      'Complex debugging',
      'Code architecture planning',
      'Technical documentation',
    ],
  },
  {
    name: 'gpt-oss:latest',
    displayName: 'GPT-OSS 20B',
    sizeGB: 13,
    performance: {
      speed: 'slow',
      quality: 'excellent',
      memoryUsage: 'high',
    },
    strengths: ['general', 'reasoning', 'creative', 'coding'],
    description: 'Large general-purpose model with strong reasoning and creative capabilities',
    useCases: [
      'Complex problem solving',
      'Creative writing and ideation',
      'Advanced code generation',
      'Research and analysis',
    ],
  },
  {
    name: 'llama3.1:latest',
    displayName: 'Llama 3.1',
    sizeGB: 4.9,
    performance: {
      speed: 'medium',
      quality: 'good',
      memoryUsage: 'medium',
    },
    strengths: ['general', 'conversation', 'coding', 'reasoning'],
    description: 'Balanced general-purpose model, good for most tasks',
    useCases: [
      'General conversations',
      'Basic to intermediate coding',
      'File analysis',
      'Documentation help',
    ],
  },
  {
    name: 'gemma3:4b',
    displayName: 'Gemma 3 4B',
    sizeGB: 3.3,
    performance: {
      speed: 'medium',
      quality: 'good',
      memoryUsage: 'medium',
    },
    strengths: ['math', 'reasoning', 'general'],
    description: 'Efficient model with strong mathematical and logical reasoning',
    useCases: [
      'Mathematical calculations',
      'Logical problem solving',
      'Data analysis',
      'Quick reasoning tasks',
    ],
  },
  {
    name: 'phi3:mini',
    displayName: 'Phi-3 Mini',
    sizeGB: 2.2,
    performance: {
      speed: 'fast',
      quality: 'good',
      memoryUsage: 'low',
    },
    strengths: ['lightweight', 'conversation', 'reasoning'],
    description: 'Compact but capable model, excellent for quick responses',
    useCases: [
      'Quick questions and answers',
      'Basic code assistance',
      'Fast iterations',
      'Low-resource environments',
    ],
  },
  {
    name: 'tinyllama:latest',
    displayName: 'TinyLlama',
    sizeGB: 0.6,
    performance: {
      speed: 'fast',
      quality: 'basic',
      memoryUsage: 'low',
    },
    strengths: ['lightweight', 'conversation'],
    description: 'Ultra-lightweight model for basic tasks and quick responses',
    useCases: [
      'Simple questions',
      'Basic text processing',
      'Ultra-fast responses',
      'Resource-constrained scenarios',
    ],
  },
];

/**
 * Maps task types to preferred model characteristics
 */
export const TASK_TO_MODEL_PREFERENCES: Record<TaskType, Partial<ModelCapabilities>> = {
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

/**
 * Analyzes prompt/project context to determine task type
 */
export function analyzeTaskType(prompt: string, projectContext?: {
  hasCodeFiles: boolean;
  primaryLanguage?: string;
  projectType?: string;
}): TaskType {
  const lowerPrompt = prompt.toLowerCase();
  
  // Code-related patterns
  if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
    return 'debugging';
  }
  
  if (lowerPrompt.includes('code') || lowerPrompt.includes('function') || 
      lowerPrompt.includes('implement') || lowerPrompt.includes('write')) {
    return 'code_generation';
  }
  
  if (lowerPrompt.includes('review') || lowerPrompt.includes('improve') || 
      lowerPrompt.includes('refactor')) {
    return 'code_review';
  }
  
  if (lowerPrompt.includes('document') || lowerPrompt.includes('readme') || 
      lowerPrompt.includes('comment')) {
    return 'documentation';
  }
  
  // Analysis patterns
  if (lowerPrompt.includes('analyze') || lowerPrompt.includes('examine') || 
      lowerPrompt.includes('explain')) {
    return projectContext?.hasCodeFiles ? 'file_analysis' : 'general_chat';
  }
  
  // Quick questions
  if (lowerPrompt.length < 50 && (lowerPrompt.includes('?') || 
      lowerPrompt.startsWith('what') || lowerPrompt.startsWith('how') || 
      lowerPrompt.startsWith('why'))) {
    return 'quick_questions';
  }
  
  // Creative patterns
  if (lowerPrompt.includes('write') || lowerPrompt.includes('create') || 
      lowerPrompt.includes('generate') && !lowerPrompt.includes('code')) {
    return 'creative_writing';
  }
  
  // Planning patterns
  if (lowerPrompt.includes('plan') || lowerPrompt.includes('architecture') || 
      lowerPrompt.includes('design')) {
    return 'project_planning';
  }
  
  // Math/reasoning patterns
  if (lowerPrompt.includes('calculate') || lowerPrompt.includes('solve') || 
      lowerPrompt.includes('math')) {
    return 'complex_reasoning';
  }
  
  return 'general_chat';
}

/**
 * Scores models based on how well they match the requirements
 */
export function scoreModelForTask(model: ModelCapabilities, taskType: TaskType): number {
  const preferences = TASK_TO_MODEL_PREFERENCES[taskType];
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
 * Recommends the best model for a given task
 */
export function recommendModel(
  taskType: TaskType,
  availableModels: string[] = MODEL_CATALOG.map(m => m.name)
): ModelCapabilities | null {
  const candidates = MODEL_CATALOG.filter(model => 
    availableModels.includes(model.name)
  );
  
  if (candidates.length === 0) return null;
  
  const scored = candidates.map(model => ({
    model,
    score: scoreModelForTask(model, taskType),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].model;
}

/**
 * Gets available models from Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    // This would typically call ollama list, but for now return the known models
    return MODEL_CATALOG.map(m => m.name);
  } catch (error) {
    console.warn('Could not fetch available models:', error);
    return ['llama3.1:latest']; // fallback
  }
}
