/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Updated to use Ollama models by default
export const DEFAULT_OLLAMA_MODEL = 'llama3.1:latest';
export const DEFAULT_GEMINI_MODEL = 'llama3.1:latest'; // Now points to Ollama model
export const DEFAULT_GEMINI_FLASH_MODEL = 'llama3.1:latest';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'phi3:mini';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'nomic-embed-text';

// Legacy Gemini model names for backward compatibility
export const LEGACY_GEMINI_PRO = 'gemini-2.5-pro';
export const LEGACY_GEMINI_FLASH = 'gemini-2.5-flash';
export const LEGACY_GEMINI_FLASH_LITE = 'gemini-2.5-flash-lite';
