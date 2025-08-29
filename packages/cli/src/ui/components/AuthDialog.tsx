/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import type { LoadedSettings } from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import { AuthType } from 'agentic-cli-core';
import { validateAuthMethod } from '../../config/auth.js';
import { useKeypress } from '../hooks/useKeypress.js';

interface AuthDialogProps {
  onSelect: (authMethod: AuthType | undefined, scope: SettingScope) => void;
  settings: LoadedSettings;
  initialErrorMessage?: string | null;
}

function parseDefaultAuthType(
  defaultAuthType: string | undefined,
): AuthType | null {
  if (
    defaultAuthType &&
    Object.values(AuthType).includes(defaultAuthType as AuthType)
  ) {
    return defaultAuthType as AuthType;
  }
  return null;
}

export function AuthDialog({
  onSelect,
  settings,
  initialErrorMessage,
}: AuthDialogProps): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (initialErrorMessage) {
      return initialErrorMessage;
    }

    const defaultAuthType = parseDefaultAuthType(
      process.env['AGENTIC_DEFAULT_AUTH_TYPE'] || process.env['GEMINI_DEFAULT_AUTH_TYPE'],
    );

    if ((process.env['AGENTIC_DEFAULT_AUTH_TYPE'] || process.env['GEMINI_DEFAULT_AUTH_TYPE']) && defaultAuthType === null) {
      const envVarUsed = process.env['AGENTIC_DEFAULT_AUTH_TYPE'] || process.env['GEMINI_DEFAULT_AUTH_TYPE'];
      return (
        `Invalid value for authentication type: "${envVarUsed}". ` +
        `Valid values are: ${Object.values(AuthType).join(', ')}.`
      );
    }

    if (
      (process.env['GEMINI_API_KEY'] || process.env['AGENTIC_API_KEY']) &&
      (!defaultAuthType || defaultAuthType === AuthType.USE_GEMINI)
    ) {
      return 'Existing API key detected. Select "Gemini API Key" option to use it.';
    }
    return null;
  });
  const items = [
    {
      label: 'Login with Google',
      value: AuthType.LOGIN_WITH_GOOGLE,
    },
    ...(process.env['CLOUD_SHELL'] === 'true'
      ? [
          {
            label: 'Use Cloud Shell user credentials',
            value: AuthType.CLOUD_SHELL,
          },
        ]
      : []),
    {
      label: 'Local LLM (Ollama)',
      value: AuthType.LOCAL_LLM,
    },
    {
      label: 'Use Gemini API Key',
      value: AuthType.USE_GEMINI,
    },
    { label: 'Vertex AI', value: AuthType.USE_VERTEX_AI },
  ];

  const initialAuthIndex = items.findIndex((item) => {
    if (settings.merged.security?.auth?.selectedType) {
      return item.value === settings.merged.security.auth.selectedType;
    }

    const defaultAuthType = parseDefaultAuthType(
      process.env['AGENTIC_DEFAULT_AUTH_TYPE'] || process.env['GEMINI_DEFAULT_AUTH_TYPE'],
    );
    if (defaultAuthType) {
      return item.value === defaultAuthType;
    }

    if (process.env['GEMINI_API_KEY'] || process.env['AGENTIC_API_KEY']) {
      return item.value === AuthType.USE_GEMINI;
    }

    return item.value === AuthType.LOCAL_LLM;
  });

  const handleAuthSelect = (authMethod: AuthType) => {
    const error = validateAuthMethod(authMethod);
    if (error) {
      setErrorMessage(error);
    } else {
      setErrorMessage(null);
      onSelect(authMethod, SettingScope.User);
    }
  };

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        // Prevent exit if there is an error message.
        // This means they user is not authenticated yet.
        if (errorMessage) {
          return;
        }
        if (settings.merged.security?.auth?.selectedType === undefined) {
          // Prevent exiting if no auth method is set
          setErrorMessage(
            'You must select an auth method to proceed. Press Ctrl+C twice to exit.',
          );
          return;
        }
        onSelect(undefined, SettingScope.User);
      }
    },
    { isActive: true },
  );

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Get started</Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate for this project?</Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect
          items={items}
          initialIndex={initialAuthIndex}
          onSelect={handleAuthSelect}
        />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.Gray}>(Use Enter to select)</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Terms of Services and Privacy Notice for agentic-cli</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.AccentBlue}>
          {
            'https://github.com/bazobehram/agentic-cli/blob/main/docs/tos-privacy.md'
          }
        </Text>
      </Box>
    </Box>
  );
}
