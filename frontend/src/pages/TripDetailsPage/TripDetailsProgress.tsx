/**
 * TripDetailsProgress — Redesigned Week 7/8
 *
 * Visual updates:
 *   - Surface-muted border instead of gray
 *   - Ink color scale for text
 *   - Brand color for completed checkmarks (instead of green ✅)
 *   - SVG checkmark icon instead of emoji
 *   - Warm styling throughout
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

// SVG Checkmark icon
const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default function TripDetailsProgress({
  progressPct,
  progressColor,
  progressTasks,
  completedCount,
  isExpanded,
  onToggle,
}: TripDetailsProgressProps) {
  return (
    <div className="bg-white border-b border-surface-muted shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">

        {/* Collapsed row */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={onToggle}
        >
          <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">
            Progress
          </span>
          <span className="text-sm font-bold text-ink">{progressPct}%</span>

          {/* Bar */}
          <div className="flex-1 max-w-[240px] h-2.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressColor }}
            />
          </div>

          <span className="text-xs text-ink-secondary">
            {completedCount}/{progressTasks.length} tasks
          </span>
          <span className="text-ink-tertiary text-xs">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>

        {/* Expanded checklist */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-surface-muted grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
            {progressTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 text-sm ${
                  task.completed ? 'text-ink-secondary' : 'text-ink-tertiary'
                }`}
              >
                {/* Checkmark or icon */}
                {task.completed ? (
                  <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <span className="text-base">{task.icon}</span>
                )}

                {/* Label */}
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