/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext, SlashCommandActionReturn } from './types.js';
import { CommandKind } from './types.js';
import { ModelSelectionService } from 'agentic-cli-core';
import type { ModelCapabilities } from 'agentic-cli-core';
import { SettingScope } from '../../config/settings.js';

interface ModelCommandArgs {
  action?: 'list' | 'switch' | 'info' | 'auto' | 'manual';
  modelName?: string;
}

function parseModelCommand(input: string): ModelCommandArgs {
  const parts = input.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { action: 'list' };
  }
  
  const action = parts[1];
  
  switch (action) {
    case 'list':
      return { action: 'list' };
    case 'info':
      // Join remaining parts for multi-word model names like "GPT-OSS 20B"
      return { action: 'info', modelName: parts.slice(2).join(' ') };
    case 'auto':
      return { action: 'auto' };
    case 'manual':
      return { action: 'manual' };
    default:
      // Assume it's a model name for switching - join all parts after /model
      return { action: 'switch', modelName: parts.slice(1).join(' ') };
  }
}

function formatModelInfo(model: ModelCapabilities): string {
  const perfIcons = {
    speed: { fast: '⚡', medium: '⚡', slow: '🐌' },
    quality: { basic: '⭐', good: '⭐⭐', excellent: '⭐⭐⭐' },
    memoryUsage: { low: '💾', medium: '💾💾', high: '💾💾💾' },
  };

  const strengthsText = model.strengths.join(', ');
  const speedIcon = perfIcons.speed[model.performance.speed];
  const qualityIcon = perfIcons.quality[model.performance.quality];
  const memoryIcon = perfIcons.memoryUsage[model.performance.memoryUsage];

  return `**${model.displayName}** (${model.name})
${model.description}

**Performance:** ${speedIcon} Speed | ${qualityIcon} Quality | ${memoryIcon} Memory (${model.sizeGB}GB)
**Strengths:** ${strengthsText}

**Use Cases:**
${model.useCases.map(useCase => `• ${useCase}`).join('\n')}`;
}

function formatModelList(models: ModelCapabilities[]): string {
  const table = models.map(model => {
    const perfIcons = {
      speed: { fast: '⚡', medium: '⚡', slow: '🐌' },
      quality: { basic: '⭐', good: '⭐⭐', excellent: '⭐⭐⭐' },
      memoryUsage: { low: '💾', medium: '💾💾', high: '💾💾💾' },
    };

    const speedIcon = perfIcons.speed[model.performance.speed];
    const qualityIcon = perfIcons.quality[model.performance.quality];
    const memoryIcon = perfIcons.memoryUsage[model.performance.memoryUsage];
    const strengthsShort = model.strengths.slice(0, 2).join(', ');

    return `${model.displayName.padEnd(15)} | ${speedIcon}${qualityIcon}${memoryIcon} | ${strengthsShort.padEnd(20)} | ${model.sizeGB}GB`;
  });

  return `Available Models:

${'Model'.padEnd(15)} | Perf | Strengths${' '.repeat(12)} | Size
${'-'.repeat(15)} | ---- | ${'-'.repeat(20)} | ----
${table.join('\n')}

**Legend:** ⚡ Speed | ⭐ Quality | 💾 Memory Usage

Use \`/model <model-name>\` to switch models
Use \`/model info <model-name>\` for detailed information
Use \`/model auto\` to enable intelligent model selection
Use \`/model manual\` to use a fixed preferred model`;
}

async function handleModelCommand(
  context: CommandContext,
  args: string,
): Promise<SlashCommandActionReturn | void> {
  const input = `/model ${args}`;
  const parsedArgs = parseModelCommand(input);
  const availableModels = ModelSelectionService.getAllModels();

  switch (parsedArgs.action) {
    case 'list':
      return {
        type: 'message',
        messageType: 'info',
        content: formatModelList(availableModels),
      };

    case 'info':
      if (!parsedArgs.modelName) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Please specify a model name. Usage: /model info <model-name>',
        };
      }

      const model = ModelSelectionService.getModelInfo(parsedArgs.modelName);
      if (!model) {
        const availableNames = availableModels.map(m => `${m.displayName} (${m.name})`).join(', ');
        return {
          type: 'message',
          messageType: 'error',
          content: `Model "${parsedArgs.modelName}" not found. Available models:
${availableNames}

You can use either the display name (e.g., "GPT-OSS 20B") or model name (e.g., "gpt-oss:latest").`,
        };
      }

      return {
        type: 'message',
        messageType: 'info',
        content: formatModelInfo(model),
      };

    case 'switch':
      if (!parsedArgs.modelName) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Please specify a model name. Usage: /model <model-name>',
        };
      }

      // First, try to find the model in our catalog (supports both display names and model names)
      const targetModel = ModelSelectionService.getModelInfo(parsedArgs.modelName);
      if (!targetModel) {
        const availableNames = availableModels.map(m => `${m.displayName} (${m.name})`).join(', ');
        return {
          type: 'message',
          messageType: 'error',
          content: `Model "${parsedArgs.modelName}" not found in catalog. Available models:
${availableNames}

You can use either the display name (e.g., "GPT-OSS 20B") or model name (e.g., "gpt-oss:latest").`,
        };
      }

      // Validate with actual Ollama installation
      try {
        const validation = await ModelSelectionService.validateModelWithOllama(targetModel.name);
        
        if (!validation.isValid) {
          return {
            type: 'message',
            messageType: 'error',
            content: validation.error || `Model "${targetModel.name}" not found in Ollama installation.`,
          };
        }
        
        // Use the actual model name from Ollama (in case it has different tags)
        const actualModelName = validation.actualModelName || targetModel.name;
        
        // Update the model and recreate content generator if needed
        const geminiClient = context.services.config?.getGeminiClient();
        if (geminiClient && geminiClient.isInitialized()) {
          await geminiClient.updateModel(actualModelName);
        } else {
          // Fallback: just update config if client not initialized
          context.services.config?.setModel(actualModelName);
        }

        return {
          type: 'message',
          messageType: 'success',
          content: `✅ **Switched to ${targetModel.displayName}**

🔹 **Model:** ${actualModelName}
🔹 **Description:** ${targetModel.description}
🔹 **Strengths:** ${targetModel.strengths.join(', ')}
🔹 **Size:** ${targetModel.sizeGB}GB

The model is ready to use!`,
        };
      } catch (error) {
        return {
          type: 'message',
          messageType: 'error',
          content: `Failed to validate model with Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

    case 'auto':
      // Enable auto model selection mode
      context.services.settings.setValue(SettingScope.User, 'model.selection.mode', 'auto');

      return {
        type: 'message',
        messageType: 'success',
        content: `🤖 **Intelligent Model Selection Enabled**

The system will now automatically choose the best model for each task based on:
• Task type analysis (coding, reasoning, creative writing, etc.)
• Project context (file types, languages)
• Performance requirements (speed vs quality)

You can still manually switch models with \`/model <model-name>\` when needed.`,
      };

    case 'manual':
      const currentModel = context.services.config?.getModel() || 'llama3.1:latest';
      const currentModelInfo = ModelSelectionService.getModelInfo(currentModel);
      
      context.services.settings.setValue(SettingScope.User, 'model.selection.mode', 'manual');
      context.services.settings.setValue(SettingScope.User, 'model.selection.preferredModel', currentModel);

      return {
        type: 'message',
        messageType: 'success',
        content: `🔧 **Manual Model Selection Enabled**

Fixed model: **${currentModelInfo?.displayName || currentModel}**

The system will use this model for all tasks. You can:
• Switch to a different model with \`/model <model-name>\`
• Enable auto-selection with \`/model auto\``,
      };

    default:
      return {
        type: 'message',
        messageType: 'error',
        content: 'Invalid model command. Use `/model list` to see available options.',
      };
  }
}

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Manage AI models - list, switch, or configure intelligent selection',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext, args: string) => {
    return await handleModelCommand(context, args);
  },
};
