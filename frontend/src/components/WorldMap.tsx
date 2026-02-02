import { useState } from 'react';
import type { FC } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import type { Trip } from '../types';
import { groupTripsByCountry, getCountryColor, getCountryHoverColor } from '../utils/countryMapping';

interface WorldMapProps {
  trips: Trip[];
  onCountryClick?: (countryCode: string) => void;
}

// TopoJSON URL for world map data (Natural Earth 110m)
const MAP_DATA_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WorldMap: FC<WorldMapProps> = ({ trips, onCountryClick }) => {
    const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
    
    // Group trips by country and determine colors
    const countryData = groupTripsByCountry(trips);
    
    // 🔍 DIAGNOSTIC: Log what we have
    console.log('=== DIAGNOSTIC START ===');
    console.log('Total trips:', trips.length);
    console.log('Trips:', trips.map(t => ({ id: t.id, destination: t.destination, status: t.status })));
    console.log('Country Data Map:', Array.from(countryData.entries()));
    console.log('Expected country codes:', Array.from(countryData.keys()));
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative w-full" style={{ height: '600px' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 20],
            }}
            className="w-full h-full"
          >
            <ZoomableGroup
              zoom={1}
              center={[0, 20]}
              minZoom={1}
              maxZoom={8}
            >
              <Geographies geography={MAP_DATA_URL}>
                {({ geographies }) => {
                  // 🔍 DIAGNOSTIC: Log first 5 geographies to see structure
                  console.log('Sample geographies:', geographies.slice(0, 5).map(g => ({
                    id: g.id,
                    properties: g.properties
                  })));
                  
                  // 🔍 DIAGNOSTIC: Log Germany and Australia specifically
                  const germany = geographies.find(g => 
                    g.properties?.name === 'Germany' || 
                    g.properties?.iso_a3 === 'DEU'
                  );
                  const australia = geographies.find(g => 
                    g.properties?.name === 'Australia' || 
                    g.properties?.iso_a3 === 'AUS'
                  );
                  
                  if (germany) {
                    console.log('🇩🇪 Germany geography:', {
                      id: germany.id,
                      properties: germany.properties
                    });
                  }
                  if (australia) {
                    console.log('🇦🇺 Australia geography:', {
                      id: australia.id,
                      properties: australia.properties
                    });
                  }
                  
                  console.log('=== DIAGNOSTIC END ===');
                  
                  return geographies.map((geo) => {
                    const countryName = geo.properties?.name?.toLowerCase();
                    const country = countryName 
                        ? Array.from(countryData.values()).find(c => 
                            c.trips.some(t => t.destination.toLowerCase() === countryName)
                            )
                        : undefined;
                    const isHovered = hoveredCountry === countryName;
                    
                    // Determine color based on trip status
                    const fillColor = isHovered
                      ? getCountryHoverColor(country?.status || null)
                      : getCountryColor(country?.status || null);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        style={{
                          default: {
                            outline: 'none',
                          },
                          hover: {
                            outline: 'none',
                            cursor: country ? 'pointer' : 'default',
                          },
                          pressed: {
                            outline: 'none',
                          },
                        }}
                        onMouseEnter={() => {
                          if (country) {
                            setHoveredCountry(countryName);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null);
                        }}
                        onClick={() => {
                          if (country && onCountryClick) {
                            onCountryClick(countryName);
                          }
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          
          {/* Hover Tooltip */}
          {hoveredCountry && countryData.has(hoveredCountry) && (
            <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs z-10">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {countryData.get(hoveredCountry)?.trips[0]?.destination || hoveredCountry}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {countryData.get(hoveredCountry)?.tripCount} {countryData.get(hoveredCountry)?.tripCount === 1 ? 'trip' : 'trips'}
                  </p>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ 
                        backgroundColor: getCountryColor(countryData.get(hoveredCountry)?.status || null) 
                      }}
                    ></div>
                    <span className="text-xs font-medium text-gray-700 capitalize">
                      {countryData.get(hoveredCountry)?.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 mt-2">
                  Click to view trips →
                </p>
              </div>
            </div>
          )}
          
          {/* Map Controls Info */}
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded px-3 py-2">
            <p className="text-xs text-gray-600">
              🖱️ Scroll to zoom • Drag to pan
            </p>
          </div>
        </div>
      </div>
    );
  };

export default WorldMap;