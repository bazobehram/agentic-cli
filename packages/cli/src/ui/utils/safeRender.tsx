/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Safely renders a value as React children, preventing "Objects are not valid as a React child" errors.
 * 
 * @param value - Any value that might be rendered as a React child
 * @returns A safe React node that can be rendered
 */
export function safeRenderValue(value: unknown): React.ReactNode {
  // Handle null and undefined
  if (value == null) {
    return null;
  }

  // Handle React elements - these are safe to render
  if (React.isValidElement(value)) {
    return value;
  }

  // Handle primitives - these are safe to render
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Handle arrays by recursively applying safeRenderValue to each element
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <React.Fragment key={index}>{safeRenderValue(item)}</React.Fragment>
    ));
  }

  // Handle objects - render a safe string representation
  if (typeof value === 'object') {
    try {
      const keys = Object.keys(value);
      return `[Object: ${keys.join(', ')}]`;
    } catch {
      return '[Object]';
    }
  }

  // Handle functions
  if (typeof value === 'function') {
    return '[Function]';
  }

  // Fallback for any other types
  return String(value);
}
