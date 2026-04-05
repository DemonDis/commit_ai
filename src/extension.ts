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
  gitmoji?: boolean;
}

const GITMOJIS = [
  { emoji: '🎨', code: ':art:', description: 'Improve structure/format of the code' },
  { emoji: '⚡️', code: ':zap:', description: 'Improve performance' },
  { emoji: '🔥', code: ':fire:', description: 'Remove code or files' },
  { emoji: '🐛', code: ':bug:', description: 'Fix a bug' },
  { emoji: '🚑', code: ':ambulance:', description: 'Critical hotfix' },
  { emoji: '✨', code: ':sparkles:', description: 'Introduce new features' },
  { emoji: '📝', code: ':memo:', description: 'Add or update documentation' },
  { emoji: '🚀', code: ':rocket:', description: 'Deploy stuff' },
  { emoji: '💄', code: ':lipstick:', description: 'Add or update the UI and style files' },
  { emoji: '🎉', code: ':tada:', description: 'Begin a project' },
  { emoji: '✅', code: ':white_check_mark:', description: 'Add, update, or pass tests' },
  { emoji: '🔒️', code: ':lock:', description: 'Fix security or privacy issues' },
  { emoji: '🔐', code: ':closed_lock_with_key:', description: 'Add or update secrets' },
  { emoji: '🔖', code: ':bookmark:', description: 'Release/Version tags' },
  { emoji: '🚨', code: ':rotating_light:', description: 'Fix compiler/linter warnings' },
  { emoji: '🚧', code: ':construction:', description: 'Work in progress' },
  { emoji: '💚', code: ':green_heart:', description: 'Fix CI Build' },
  { emoji: '⬇️', code: ':arrow_down:', description: 'Downgrade dependencies' },
  { emoji: '⬆️', code: ':arrow_up:', description: 'Upgrade dependencies' },
  { emoji: '📌', code: ':pushpin:', description: 'Pin dependencies to specific versions' },
  { emoji: '👷', code: ':construction_worker:', description: 'Add or update CI build system' },
  { emoji: '📈', code: ':chart_with_upwards_trend:', description: 'Add or update analytics or track code' },
  { emoji: '♻️', code: ':recycle:', description: 'Refactor code' },
  { emoji: '➕', code: ':heavy_plus_sign:', description: 'Add a dependency' },
  { emoji: '➖', code: ':heavy_minus_sign:', description: 'Remove a dependency' },
  { emoji: '🔧', code: ':wrench:', description: 'Add or update configuration files' },
  { emoji: '🔨', code: ':hammer:', description: 'Add or update development scripts' },
  { emoji: '🌐', code: ':globe_with_meridians:', description: 'Internationalization and localization' },
  { emoji: '✏️', code: ':pencil2:', description: 'Fix typos' },
  { emoji: '💩', code: ':poop:', description: 'Write bad code that needs to be improved' },
  { emoji: '⏪', code: ':rewind:', description: 'Revert changes' },
  { emoji: '🔀', code: ':twisted_rightwards_arrows:', description: 'Merge branches' },
  { emoji: '📦', code: ':package:', description: 'Add or update compiled files or packages' },
  { emoji: '👽️', code: ':alien:', description: 'Update code due to external API changes' },
  { emoji: '🚚', code: ':truck:', description: 'Move or rename resources' },
  { emoji: '📄', code: ':page_facing_up:', description: 'Add or update license' },
  { emoji: '💥', code: ':boom:', description: 'Introduce breaking changes' },
  { emoji: '🍱', code: ':bento:', description: 'Add or update assets' },
  { emoji: '♿️', code: ':wheelchair:', description: 'Improve accessibility' },
  { emoji: '💡', code: ':bulb:', description: 'Add or update comments in source code' },
  { emoji: '🍻', code: ':beers:', description: 'Write code drunkenly' },
  { emoji: '💬', code: ':speech_balloon:', description: 'Add or update text and literals' },
  { emoji: '🗃️', code: ':card_file_box:', description: 'Perform database related changes' },
  { emoji: '🔊', code: ':loud_sound:', description: 'Add or update logs' },
  { emoji: '🔇', code: ':mute:', description: 'Remove logs' },
  { emoji: '👥', code: ':busts_in_silhouette:', description: 'Add or update contributor(s)' },
  { emoji: '🚸', code: ':children_crossing:', description: 'Improve user experience/usability' },
  { emoji: '🏗️', code: ':building_construction:', description: 'Make architectural changes' },
  { emoji: '📱', code: ':iphone:', description: 'Work on responsive design' },
  { emoji: '🤡', code: ':clown_face:', description: 'Mock things' },
  { emoji: '🥚', code: ':egg:', description: 'Add or update an easter egg' },
  { emoji: '🙈', code: ':see_no_evil:', description: 'Add or update a .gitignore file' },
  { emoji: '📸', code: ':camera_flash:', description: 'Add or update snapshots' },
  { emoji: '⚗️', code: ':alembic:', description: 'Perform experiments' },
  { emoji: '🔍', code: ':mag:', description: 'Improve SEO' },
  { emoji: '🏷️', code: ':label:', description: 'Add or update types' },
  { emoji: '🌱', code: ':seedling:', description: 'Add or update seed files' },
  { emoji: '🚩', code: ':triangular_flag_on_post:', description: 'Add, update, or remove feature flags' },
  { emoji: '🥅', code: ':goal_net:', description: 'Catch errors' },
  { emoji: '💫', code: ':dizzy:', description: 'Add or update animations and transitions' },
  { emoji: '🗑️', code: ':wastebasket:', description: 'Deprecate code that needs to be cleaned up' },
  { emoji: '🛂', code: ':passport_control:', description: 'Work on code related to authorization, roles and permissions' },
  { emoji: '🩹', code: ':adhesive_bandage:', description: 'Simple fix for a non-critical issue' },
  { emoji: '🧐', code: ':monocle_face:', description: 'Data exploration/inspection' },
  { emoji: '⚰️', code: ':coffin:', description: 'Remove dead code' },
  { emoji: '🧪', code: ':test_tube:', description: 'Add a failing test' },
  { emoji: '👔', code: ':necktie:', description: 'Add or update business logic' },
  { emoji: '🩺', code: ':stethoscope:', description: 'Add or update healthcheck' },
  { emoji: '🧱', code: ':bricks:', description: 'Infrastructure related changes' },
  { emoji: '🧑‍💻', code: ':technologist:', description: 'Improve developer experience' },
  { emoji: '💸', code: ':money_with_wings:', description: 'Add sponsorships or money related infrastructure' },
  { emoji: '🧵', code: ':thread:', description: 'Add or update code related to multithreading or concurrency' },
  { emoji: '🦺', code: ':safety_vest:', description: 'Add or update code related to validation' },
  { emoji: '✈️', code: ':airplane:', description: 'Improve offline support' },
  { emoji: '🦖', code: ':t-rex:', description: 'Code that adds backwards compatibility' },
];

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
    prompt: 'Generate a concise git commit message (max 72 characters for title). Analyze this diff and create a semantic commit message:\n\n{diff}\n\nReturn ONLY the commit message, no explanation.',
    gitmoji: false
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

  // Формируем промпт
  let promptText = config.prompt || 'Generate a concise git commit message (max 72 characters for title). Analyze this diff and create a semantic commit message:\n\n{diff}\n\nReturn ONLY the commit message, no explanation.';
  
  // Если включен gitmoji, добавляем инструкцию
  if (config.gitmoji) {
    const gitmojiList = GITMOJIS.map(g => `${g.emoji} (${g.code}) - ${g.description}`).join('\n');
    promptText = `You are generating a git commit message. 
Available gitmojis:
${gitmojiList}

Instructions:
1. Analyze the diff below
2. Choose the most appropriate gitmoji from the list
3. Format: <emoji> <message> (e.g., "✨ Add new feature" or "🐛 Fix login bug")

Diff:
${diff}

Return ONLY the commit message with gitmoji, no explanation.`;
  } else {
    promptText = promptText.replace('{diff}', diff);
  }

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: promptText }],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || 'chore: update';
}

export function activate(context: vscode.ExtensionContext) {
  // Команда для настройки
  const setupCommand = vscode.commands.registerCommand('commit-ai-ilnsk.setup', async () => {
    const config = await createConfigFile();
    if (config) {
      vscode.window.showInformationMessage('Commit AI configured!');
    }
  });

  // Команда генерации
  const disposable = vscode.commands.registerCommand('commit-ai-ilnsk.generate', async () => {
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