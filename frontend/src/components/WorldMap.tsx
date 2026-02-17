import { useState } from 'react';
import type { FC } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import type { Trip, CountryData } from '../types';
import {
  groupTripsByCountry,
  getCountryColor,
  getCountryHoverColor,
  getAlpha3FromGeoName,
} from '../utils/countryMapping';

interface WorldMapProps {
  trips: Trip[];
  onCountryClick?: (trips: Trip[], countryName: string) => void;
}

interface HoverInfo {
  data: CountryData;
  geoName: string;
}

const MAP_DATA_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WorldMap: FC<WorldMapProps> = ({ trips, onCountryClick }) => {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Keyed by alpha-3 (e.g. "RUS", "DEU")
  const countryData = groupTripsByCountry(trips);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="relative w-full" style={{ height: '600px' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [0, 20] }}
          className="w-full h-full"
        >
          <ZoomableGroup zoom={1} center={[0, 20]} minZoom={1} maxZoom={8}>
            <Geographies geography={MAP_DATA_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoName: string = geo.properties?.name || '';

                  // ── FIX: resolve geo name → alpha-3 → look up countryData ──
                  // Previously matched by destination string vs geo name,
                  // which broke for cities ("Moscow" ≠ "Russia").
                  // Now we convert the geo's own country name to alpha-3 first.
                  const alpha3 = getAlpha3FromGeoName(geoName);
                  const country = alpha3 ? countryData.get(alpha3) : undefined;

                  const isHovered =
                    hoverInfo !== null &&
                    alpha3 !== null &&
                    hoverInfo.data.countryCode === alpha3;

                  const fillColor = isHovered
                    ? getCountryHoverColor(country?.status ?? null)
                    : getCountryColor(country?.status ?? null);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          outline: 'none',
                          cursor: country ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={() => {
                        if (country) setHoverInfo({ data: country, geoName });
                      }}
                      onMouseLeave={() => setHoverInfo(null)}
                      onTouchStart={() => {
                        if (country) setHoverInfo({ data: country, geoName });
                      }}
                      onClick={() => {
                        if (country && onCountryClick) {
                          onCountryClick(country.trips, geoName);
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {hoverInfo && (
          <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs z-10 pointer-events-none">
            <p className="text-sm font-semibold text-gray-900">{hoverInfo.geoName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {hoverInfo.data.tripCount}{' '}
              {hoverInfo.data.tripCount === 1 ? 'trip' : 'trips'}
            </p>

            {hoverInfo.data.tripCount === 1 && (
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getCountryColor(hoverInfo.data.status) }}
                />
                <span className="text-xs text-gray-700">
                  {hoverInfo.data.trips[0].destination}
                </span>
                <span className="text-xs text-gray-400 capitalize">
                  ({hoverInfo.data.trips[0].status})
                </span>
              </div>
            )}

            {hoverInfo.data.tripCount > 1 && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5">
                {hoverInfo.data.trips.map((trip) => (
                  <div key={trip.id} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: getCountryColor(
                          trip.status as 'planning' | 'booked' | 'completed'
                        ),
                      }}
                    />
                    <span className="text-xs text-gray-700">{trip.destination}</span>
                    <span className="text-xs text-gray-400 capitalize">
                      ({trip.status})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-blue-600 mt-2.5">
              {hoverInfo.data.tripCount === 1
                ? 'Click to view trip →'
                : 'Click to select a trip →'}
            </p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded px-3 py-2">
          <p className="text-xs text-gray-600">🖱️ Scroll to zoom • Drag to pan</p>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;