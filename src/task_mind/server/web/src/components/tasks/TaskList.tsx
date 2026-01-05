import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '@/hooks/useTasks';
import * as api from '@/api';
import { useAppStore } from '@/stores/appStore';
import TaskCard from './TaskCard';
import EmptyState from '@/components/ui/EmptyState';
import { Send, ClipboardList, Folder } from 'lucide-react';

export default function TaskList() {
  const { t } = useTranslation();
  const { tasks, viewDetail, refresh } = useTasks();
  const { config, updateConfig, showToast } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [executionMode, setExecutionMode] = useState<'agent' | 'do' | 'run'>('agent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const aiTitleEnabled = config?.ai_title_enabled ?? false;

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Prepend execution mode command if not agent
      let finalPrompt = trimmed;
      if (executionMode === 'do') {
        finalPrompt = `/task-mind.do ${trimmed}`;
      } else if (executionMode === 'run') {
        finalPrompt = `/task-mind.run ${trimmed}`;
      }
      
      const result = await api.startAgentTask(finalPrompt, projectPath || undefined);
      if (result.status === 'ok') {
        setPrompt('');
        refresh?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const result = await api.selectDirectory();
      if (result.status === 'ok' && result.path) {
        setProjectPath(result.path);
      } else if (result.status === 'error') {
        showToast(result.error || 'Failed to select directory', 'error');
      }
    } catch (err) {
      console.error('Directory selection failed:', err);
      showToast('Failed to select directory', 'error');
    }
  };

  const handleAiTitleToggle = async (checked: boolean) => {
    await updateConfig({ ai_title_enabled: checked });
    // Refresh tasks to apply new setting
    refresh?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* AI Title Toggle */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={aiTitleEnabled}
            onChange={(e) => handleAiTitleToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label={t('tasks.aiTitleToggle')}
          />
          <span>{t('tasks.aiTitleToggle')}</span>
        </label>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <EmptyState
          Icon={ClipboardList}
          title={t('tasks.noTasks')}
          description={t('tasks.noTasksDescription')}
        />
      ) : (
        <div className="page-scroll flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.session_id}
              task={task}
              onClick={() => viewDetail(task.session_id)}
            />
          ))}
        </div>
      )}

      {/* Input Area - Fixed at Bottom */}
      <div className="task-input-area">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
          <select
            value={executionMode}
            onChange={(e) => setExecutionMode(e.target.value as 'agent' | 'do' | 'run')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="agent">Agent (default)</option>
            <option value="do">/task-mind.do (task executor)</option>
            <option value="run">/task-mind.run (explorer)</option>
          </select>
          <button
            onClick={handleSelectDirectory}
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <Folder size={16} />
            <span>{projectPath || t('tasks.selectProjectPath') || 'Select project'}</span>
          </button>
          {projectPath && (
            <button
              onClick={() => setProjectPath('')}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              ✕
            </button>
          )}
        </div>
        <div className="task-input-wrapper">
        <textarea
          className="task-input"
          placeholder={t('tasks.inputPlaceholder')}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={`task-input-btn ${prompt.trim() ? 'visible' : ''}`}
          onClick={handleSubmit}
          disabled={isSubmitting || !prompt.trim()}
        >
          {isSubmitting ? (
            <div className="spinner" />
          ) : (
            <Send size={16} />
          )}
        </button>
        </div>
      </div>
    </div>
  );
}
