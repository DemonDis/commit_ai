# Commit AI - VS Code расширение

AI-powered генерация commit сообщений для VS Code.

## Установка

### Вариант 1: Готовый VSIX
1. Скачайте файл `commit-ai-ilnsk-1.0.0.vsix`
2. В VS Code: Extensions → `...` → "Install from VSIX"
3. Выберите скачанный файл

### Вариант 2: Из исходников
```bash
git clone <repository-url>
cd commit_ai
npm install
```

## Сборка

### Установка инструментов
```bash
npm install -g @vscode/vsce
```

### Разработка
```bash
# Запуск в режиме отладки (F5 в VS Code)
npm run watch
```

### Сборка .vsix
```bash
vsce package
```
Результат: `commit-ai-ilnsk-1.0.0.vsix`

### Публикация (опционально)
```bash
vsce publish
```

## Настройка

1. Откройте VS Code Settings (`cmd+,`)
2. Найдите "Commit AI"
3. Настройте параметры:
   - `commit-ai-ilnsk.apiUrl` - URL API (по умолчанию: ``)
   - `commit-ai-ilnsk.apiKey` - API ключ
   - `commit-ai-ilnsk.model` - модель (по умолчанию: ``)

## Использование

1. Сделайте изменения в коде
2. Откройте Source Control (Ctrl+Shift+G)
3. Станьте файлы (кнопка +)
4. Нажмите иконку 💡 в заголовке SCM
5. Сообщение автоматически добавится в поле ввода коммита

### Клавиша
- `Cmd+Shift+G` - сгенерировать commit message

## Конфигурация

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| commit-ai-ilnsk.apiUrl | URL AI API | - |
| commit-ai-ilnsk.apiKey | API ключ | - |
| commit-ai-ilnsk.model | Модель | - |
| commit-ai-ilnsk.maxTokens | Макс. токенов | 200 |