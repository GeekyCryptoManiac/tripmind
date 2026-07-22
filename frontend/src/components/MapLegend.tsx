import type { FC } from 'react';

interface MapLegendProps {
  planningCount: number;
  bookedCount: number;
  completedCount: number;
}

const MapLegend: FC<MapLegendProps> = ({ planningCount, bookedCount, completedCount }) => {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
      <h3 className="text-base font-semibold text-inkText mb-4">Trip Status</h3>

      <div className="space-y-3">
        {/* Planning */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-status-planning-text" />
            <span className="text-sm font-medium text-inkText-secondary">Planning</span>
          </div>
          <span className="text-sm font-semibold text-inkText">{planningCount}</span>
        </div>

        {/* Booked */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-status-booked-text" />
            <span className="text-sm font-medium text-inkText-secondary">Booked</span>
          </div>
          <span className="text-sm font-semibold text-inkText">{bookedCount}</span>
        </div>

        {/* Completed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-status-completed-text" />
            <span className="text-sm font-medium text-inkText-secondary">Completed</span>
          </div>
          <span className="text-sm font-semibold text-inkText">{completedCount}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-muted">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-inkText-secondary">Total Trips</span>
          <span className="text-lg font-bold text-inkText">
            {planningCount + bookedCount + completedCount}
          </span>
        </div>
      </div>

      <div className="mt-6 text-xs text-inkText-tertiary">
        <p className="mb-2">🌍 Click on a country to view trips</p>
        <p>Colors show the highest priority trip status per country</p>
      </div>
    </div>
  );
};

export default MapLegend;