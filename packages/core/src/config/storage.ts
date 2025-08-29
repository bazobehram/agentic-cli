/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export const AGENTIC_DIR = '.agentic-cli';
export const GOOGLE_ACCOUNTS_FILENAME = 'google_accounts.json';
const TMP_DIR_NAME = 'tmp';

export class Storage {
  private readonly targetDir: string;

  constructor(targetDir: string) {
    this.targetDir = targetDir;
  }

  static getGlobalAgenticDir(): string {
    const homeDir = os.homedir();
    if (!homeDir) {
      return path.join(os.tmpdir(), '.agentic-cli');
    }
    return path.join(homeDir, AGENTIC_DIR);
  }

  static getMcpOAuthTokensPath(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'mcp-oauth-tokens.json');
  }

  static getGlobalSettingsPath(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'settings.json');
  }

  static getInstallationIdPath(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'installation_id');
  }

  static getGoogleAccountsPath(): string {
    return path.join(Storage.getGlobalAgenticDir(), GOOGLE_ACCOUNTS_FILENAME);
  }

  static getUserCommandsDir(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'commands');
  }

  static getGlobalMemoryFilePath(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'memory.md');
  }

  static getGlobalTempDir(): string {
    return path.join(Storage.getGlobalAgenticDir(), TMP_DIR_NAME);
  }

  getAgenticDir(): string {
    return path.join(this.targetDir, AGENTIC_DIR);
  }

  getProjectTempDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const tempDir = Storage.getGlobalTempDir();
    return path.join(tempDir, hash);
  }

  ensureProjectTempDirExists(): void {
    fs.mkdirSync(this.getProjectTempDir(), { recursive: true });
  }

  static getOAuthCredsPath(): string {
    return path.join(Storage.getGlobalAgenticDir(), 'oauth_creds.json');
  }

  getProjectRoot(): string {
    return this.targetDir;
  }

  private getFilePathHash(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }

  getHistoryDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const historyDir = path.join(Storage.getGlobalAgenticDir(), 'history');
    return path.join(historyDir, hash);
  }

  getWorkspaceSettingsPath(): string {
    return path.join(this.getAgenticDir(), 'settings.json');
  }

  getProjectCommandsDir(): string {
    return path.join(this.getAgenticDir(), 'commands');
  }

  getProjectTempCheckpointsDir(): string {
    return path.join(this.getProjectTempDir(), 'checkpoints');
  }

  getExtensionsDir(): string {
    return path.join(this.getAgenticDir(), 'extensions');
  }

  getExtensionsConfigPath(): string {
    return path.join(this.getExtensionsDir(), 'agentic-extension.json');
  }

  getHistoryFilePath(): string {
    return path.join(this.getProjectTempDir(), 'shell_history');
  }
}
