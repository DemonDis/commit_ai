import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface CommitInfo {
  staged: string[];
  diff: string;
}

interface CommitAIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  prompt?: string;
}

function getConfigPath(): string {
  // Файл создается в корне проекта (workspace)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceFolder) {
    return path.join(workspaceFolder, '.ilnsk');
  }
  // Фоллбек на домашнюю директорию
  return path.join(os.homedir(), '.ilnsk');
}

function loadConfig(): CommitAIConfig | null {
  const configPath = getConfigPath();
  
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config: CommitAIConfig = JSON.parse(content);
      
      // Обязательные поля
      if (config.apiUrl && config.apiKey && config.model) {
        return config;
      }
      
      // Показываем предупреждение о неполном конфиге
      vscode.window.showWarningMessage('Config incomplete. Please fill apiUrl, apiKey, and model in .ilnsk');
      return null;
    } catch {
      vscode.window.showErrorMessage('Config file corrupted. Please check .ilnsk');
      return null;
    }
  }
  
  // Файла нет - создаем шаблон
  const template: CommitAIConfig = {
    apiUrl: '',
    apiKey: '',
    model: '',
    prompt: 'Generate a concise git commit message (max 72 characters for title). Analyze this diff and create a semantic commit message:\n\n{diff}\n\nReturn ONLY the commit message, no explanation.'
  };
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
    vscode.window.showInformationMessage(`Config template created at ${configPath}. Please edit it.`);
  } catch (e) {
    vscode.window.showErrorMessage(`Failed to create config: ${e}`);
  }
  
  return null;
}

function saveConfig(config: CommitAIConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function createConfigFile(): Promise<CommitAIConfig | null> {
  const apiUrl = await vscode.window.showInputBox({
    title: 'Commit AI - API URL',
    prompt: 'Enter API URL (e.g., URL)'
  });
  
  if (!apiUrl) { return null; }
  
  const apiKey = await vscode.window.showInputBox({
    title: 'Commit AI - API Key',
    password: true,
    prompt: 'Enter API Key'
  });
  
  if (!apiKey) { return null; }
  
  const model = await vscode.window.showInputBox({
    title: 'Commit AI - Model',
    prompt: 'Enter model name (e.g., models)'
  });
  
  if (!model) { return null; }
  
  const config: CommitAIConfig = { apiUrl, apiKey, model };
  saveConfig(config);
  
  vscode.window.showInformationMessage(`Config saved to ${getConfigPath()}`);
  return config;
}

function getGitDiff(): CommitInfo | null {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const options = workspaceFolder ? { cwd: workspaceFolder } : {};

    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8', ...options })
      .trim()
      .split('\n')
      .filter(f => f.length > 0);

    let diff = '';
    if (staged.length > 0) {
      diff = execSync('git diff --cached', { encoding: 'utf-8', ...options });
    } else {
      const changed = execSync('git diff --name-only', { encoding: 'utf-8', ...options }).trim();
      if (changed.length > 0) {
        diff = execSync('git diff', { encoding: 'utf-8', ...options });
      }
    }

    return { staged, diff };
  } catch {
    return null;
  }
}

async function generateCommitMessage(diff: string): Promise<string> {
  let config = loadConfig();
  
  if (!config) {
    throw new Error(`Config file created at ${getConfigPath()}. Please edit it with your API credentials and try again.`);
  }

  const OpenAI = require('openai');
  const openai = new OpenAI({ 
    apiKey: config.apiKey,
    baseURL: config.apiUrl
  });

  // Используем кастомный промпт или дефолтный
  let prompt = config.prompt || 'Generate a concise git commit message (max 72 characters for title). Analyze this diff and create a semantic commit message:\n\n{diff}\n\nReturn ONLY the commit message, no explanation.';
  
  // Заменяем {diff} на актуальный diff
  prompt = prompt.replace('{diff}', diff);

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || 'chore: update';
}

export function activate(context: vscode.ExtensionContext) {
  // Команда для настройки
  const setupCommand = vscode.commands.registerCommand('commit-ai.setup', async () => {
    const config = await createConfigFile();
    if (config) {
      vscode.window.showInformationMessage('Commit AI configured!');
    }
  });

  // Команда генерации
  const disposable = vscode.commands.registerCommand('commit-ai.generate', async () => {
    try {
      const commitInfo = getGitDiff();
      
      if (!commitInfo || commitInfo.diff.length === 0) {
        vscode.window.showWarningMessage('No changes found. Make some changes first.');
        return;
      }

      const fileCount = commitInfo.staged.length > 0 ? commitInfo.staged.length : 
        execSync('git diff --name-only', { encoding: 'utf-8', cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }).trim().split('\n').filter(f => f.length > 0).length;

      if (fileCount === 0) {
        vscode.window.showWarningMessage('No files changed. Make some changes first.');
        return;
      }

      vscode.window.showInformationMessage('Generating commit message...');

      const message = await generateCommitMessage(commitInfo.diff);

      // Пробуем найти SCM input через Git extension API
      try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension && gitExtension.exports) {
          const gitApi = gitExtension.exports.getAPI(1);
          
          if (gitApi.repositories && gitApi.repositories.length > 0) {
            const repo = gitApi.repositories[0];
            if (repo.inputBox) {
              repo.inputBox.value = message;
              vscode.window.showInformationMessage('Added to SCM!');
              return;
            }
          }
        }
      } catch (e) {
        console.log('Git API error:', e);
      }

      // Показываем как fallback
      await vscode.env.clipboard.writeText(message);
      vscode.window.showInformationMessage(message);
    } catch (error: any) {
      vscode.window.showErrorMessage(error.message || 'Failed to generate commit message');
    }
  });

  context.subscriptions.push(setupCommand, disposable);
}

export function deactivate() {}