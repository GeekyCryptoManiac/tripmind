import type { FC } from 'react';

interface MapLegendProps {
  planningCount: number;
  bookedCount: number;
  completedCount: number;
}

const MapLegend: FC<MapLegendProps> = ({ planningCount, bookedCount, completedCount }) => {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
      <h3 className="text-base font-semibold text-ink mb-4">Trip Status</h3>

      <div className="space-y-3">
        {/* Planning */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-400" />
            <span className="text-sm font-medium text-ink-secondary">Planning</span>
          </div>
          <span className="text-sm font-semibold text-ink">{planningCount}</span>
        </div>

        {/* Booked */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-brand-500" />
            <span className="text-sm font-medium text-ink-secondary">Booked</span>
          </div>
          <span className="text-sm font-semibold text-ink">{bookedCount}</span>
        </div>

        {/* Completed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500" />
            <span className="text-sm font-medium text-ink-secondary">Completed</span>
          </div>
          <span className="text-sm font-semibold text-ink">{completedCount}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-muted">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-secondary">Total Trips</span>
          <span className="text-lg font-bold text-ink">
            {planningCount + bookedCount + completedCount}
          </span>
        </div>
      </div>

      <div className="mt-6 text-xs text-ink-tertiary">
        <p className="mb-2">🌍 Click on a country to view trips</p>
        <p>Colors show the highest priority trip status per country</p>
      </div>
    </div>
  );
};

export default MapLegend;