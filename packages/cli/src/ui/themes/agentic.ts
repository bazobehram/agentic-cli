/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme, type ColorsTheme } from './theme.js';

// Agentic theme - Modern, professional color scheme with vibrant orange/teal accents
export const agenticTheme: ColorsTheme = {
  type: 'dark',
  Background: '#0F0F17',          // Deep dark background with slight blue tint
  Foreground: '#F0F6FC',          // Brighter white for better contrast
  LightBlue: '#79C0FF',           // Softer blue for links
  AccentBlue: '#388BFD',          // Vibrant blue for accents
  AccentPurple: '#D2A8FF',        // Softer purple
  AccentCyan: '#56D4DD',          // Bright teal/cyan
  AccentGreen: '#7EE787',         // Bright green
  AccentYellow: '#FFD33D',        // Bright yellow
  AccentRed: '#FF7B72',           // Warm red
  DiffAdded: '#1B4B3A',           // Richer green for diff additions
  DiffRemoved: '#4B1B1E',         // Richer red for diff removals
  Comment: '#8B949E',             // Better contrast gray for comments
  Gray: '#7D8590',                // Medium gray
  GradientColors: ['#FF6B35', '#F7931E', '#56D4DD'], // Orange to bright teal gradient
};

export const AgenticDark: Theme = new Theme(
  'Agentic',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: agenticTheme.Background,
      color: agenticTheme.Foreground,
    },
    'hljs-keyword': {
      color: agenticTheme.AccentBlue,
    },
    'hljs-literal': {
      color: agenticTheme.AccentBlue,
    },
    'hljs-symbol': {
      color: agenticTheme.AccentBlue,
    },
    'hljs-name': {
      color: agenticTheme.AccentBlue,
    },
    'hljs-link': {
      color: agenticTheme.AccentBlue,
      textDecoration: 'underline',
    },
    'hljs-built_in': {
      color: agenticTheme.AccentCyan,
    },
    'hljs-type': {
      color: agenticTheme.AccentCyan,
    },
    'hljs-number': {
      color: agenticTheme.AccentGreen,
    },
    'hljs-class': {
      color: agenticTheme.AccentGreen,
    },
    'hljs-string': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-meta-string': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-regexp': {
      color: agenticTheme.AccentRed,
    },
    'hljs-template-tag': {
      color: agenticTheme.AccentRed,
    },
    'hljs-subst': {
      color: agenticTheme.Foreground,
    },
    'hljs-function': {
      color: agenticTheme.Foreground,
    },
    'hljs-title': {
      color: agenticTheme.Foreground,
    },
    'hljs-params': {
      color: agenticTheme.Foreground,
    },
    'hljs-formula': {
      color: agenticTheme.Foreground,
    },
    'hljs-comment': {
      color: agenticTheme.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: agenticTheme.Comment,
      fontStyle: 'italic',
    },
    'hljs-doctag': {
      color: agenticTheme.Comment,
    },
    'hljs-meta': {
      color: agenticTheme.Gray,
    },
    'hljs-meta-keyword': {
      color: agenticTheme.Gray,
    },
    'hljs-tag': {
      color: agenticTheme.Gray,
    },
    'hljs-variable': {
      color: agenticTheme.AccentPurple,
    },
    'hljs-template-variable': {
      color: agenticTheme.AccentPurple,
    },
    'hljs-attr': {
      color: agenticTheme.LightBlue,
    },
    'hljs-attribute': {
      color: agenticTheme.LightBlue,
    },
    'hljs-builtin-name': {
      color: agenticTheme.LightBlue,
    },
    'hljs-section': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-bullet': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-selector-tag': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-selector-id': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-selector-class': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-selector-attr': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-selector-pseudo': {
      color: agenticTheme.AccentYellow,
    },
    'hljs-addition': {
      backgroundColor: agenticTheme.DiffAdded,
      display: 'inline-block',
      width: '100%',
    },
    'hljs-deletion': {
      backgroundColor: agenticTheme.DiffRemoved,
      display: 'inline-block',
      width: '100%',
    },
  },
  agenticTheme,
);
