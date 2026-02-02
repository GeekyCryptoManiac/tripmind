import type { FC } from 'react';

interface MapLegendProps {
  planningCount: number;
  bookedCount: number;
  completedCount: number;
}

const MapLegend: FC<MapLegendProps> = ({ planningCount, bookedCount, completedCount }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Status</h3>
      
      <div className="space-y-3">
        {/* Planning */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-red-500"></div>
            <span className="text-sm font-medium text-gray-700">Planning</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{planningCount}</span>
        </div>
        
        {/* Booked */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-500"></div>
            <span className="text-sm font-medium text-gray-700">Booked</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{bookedCount}</span>
        </div>
        
        {/* Completed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">Completed</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{completedCount}</span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Trips</span>
          <span className="text-lg font-bold text-gray-900">
            {planningCount + bookedCount + completedCount}
          </span>
        </div>
      </div>
      
      <div className="mt-6 text-xs text-gray-500">
        <p className="mb-2">🌍 Click on a country to view trips</p>
        <p>Colors show the highest priority trip status per country</p>
      </div>
    </div>
  );
};

export default MapLegend;