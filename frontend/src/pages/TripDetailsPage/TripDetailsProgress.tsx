/**
 * TripDetailsProgress
 * 
 * Collapsible progress bar showing trip completion percentage
 * and expandable checklist of tasks.
 */

import type { ProgressTask } from './helpers';

interface TripDetailsProgressProps {
  progressPct: number;
  progressColor: string;
  progressTasks: ProgressTask[];
  completedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function TripDetailsProgress({
  progressPct,
  progressColor,
  progressTasks,
  completedCount,
  isExpanded,
  onToggle,
}: TripDetailsProgressProps) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Collapsed row */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={onToggle}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Progress
          </span>
          <span className="text-sm font-bold text-gray-900">{progressPct}%</span>

          {/* Bar */}
          <div className="flex-1 max-w-[240px] h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressColor }}
            />
          </div>

          <span className="text-xs text-gray-400">
            {completedCount}/{progressTasks.length} tasks
          </span>
          <span className="text-gray-400 text-xs">
            {isExpanded ? '▲' : '▼ View Details'}
          </span>
        </div>

        {/* Expanded checklist */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
            {progressTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 text-sm ${
                  task.completed ? 'text-green-700' : 'text-gray-400'
                }`}
              >
                <span>{task.completed ? '✅' : task.icon}</span>
                <span className={task.completed ? 'line-through opacity-70' : ''}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}