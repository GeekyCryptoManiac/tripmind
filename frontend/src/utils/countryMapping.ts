/**
 * Country Mapping Utility
 * 
 * Maps destination names (countries, cities, regions) to ISO 3166-1 alpha-3 country codes
 * Used for coloring countries on the world map based on trip destinations
 */

import type { Trip, CountryData } from '../types';

/**
 * Comprehensive mapping of destinations to ISO 3166-1 alpha-3 country codes
 * Includes: countries, major cities, regions, and common variations
 */
export const DESTINATION_TO_COUNTRY_CODE: Record<string, string> = {
  // Asia - Countries
  'japan': 'JPN',
  'china': 'CHN',
  'south korea': 'KOR',
  'korea': 'KOR',
  'thailand': 'THA',
  'singapore': 'SGP',
  'malaysia': 'MYS',
  'indonesia': 'IDN',
  'philippines': 'PHL',
  'vietnam': 'VNM',
  'india': 'IND',
  'taiwan': 'TWN',
  'hong kong': 'HKG',
  'cambodia': 'KHM',
  'laos': 'LAO',
  'myanmar': 'MMR',
  'burma': 'MMR',
  'nepal': 'NPL',
  'sri lanka': 'LKA',
  'maldives': 'MDV',
  'bhutan': 'BTN',
  'pakistan': 'PAK',
  'bangladesh': 'BGD',
  
  // Asia - Major Cities
  'tokyo': 'JPN',
  'osaka': 'JPN',
  'kyoto': 'JPN',
  'beijing': 'CHN',
  'shanghai': 'CHN',
  ' Hong kong': 'HKG',
  'seoul': 'KOR',
  'bangkok': 'THA',
  'Singapore': 'SGP',
  'kuala lumpur': 'MYS',
  'jakarta': 'IDN',
  'bali': 'IDN',
  'manila': 'PHL',
  'ho chi minh': 'VNM',
  'hanoi': 'VNM',
  'mumbai': 'IND',
  'delhi': 'IND',
  'new delhi': 'IND',
  'bangalore': 'IND',
  'dubai': 'ARE',
  'abu dhabi': 'ARE',
  'istanbul': 'TUR',
  
  // Europe - Countries
  'france': 'FRA',
  'germany': 'DEU',
  'italy': 'ITA',
  'spain': 'ESP',
  'united kingdom': 'GBR',
  'uk': 'GBR',
  'england': 'GBR',
  'scotland': 'GBR',
  'wales': 'GBR',
  'netherlands': 'NLD',
  'belgium': 'BEL',
  'switzerland': 'CHE',
  'austria': 'AUT',
  'portugal': 'PRT',
  'greece': 'GRC',
  'norway': 'NOR',
  'sweden': 'SWE',
  'denmark': 'DNK',
  'finland': 'FIN',
  'ireland': 'IRL',
  'poland': 'POL',
  'czech republic': 'CZE',
  'czechia': 'CZE',
  'hungary': 'HUN',
  'croatia': 'HRV',
  'turkey': 'TUR',
  'russia': 'RUS',
  'iceland': 'ISL',
  'romania': 'ROU',
  'bulgaria': 'BGR',
  
  // Europe - Major Cities
  'paris': 'FRA',
  'london': 'GBR',
  'rome': 'ITA',
  'milan': 'ITA',
  'venice': 'ITA',
  'florence': 'ITA',
  'barcelona': 'ESP',
  'madrid': 'ESP',
  'berlin': 'DEU',
  'munich': 'DEU',
  'amsterdam': 'NLD',
  'brussels': 'BEL',
  'zurich': 'CHE',
  'geneva': 'CHE',
  'vienna': 'AUT',
  'lisbon': 'PRT',
  'athens': 'GRC',
  'oslo': 'NOR',
  'stockholm': 'SWE',
  'copenhagen': 'DNK',
  'helsinki': 'FIN',
  'dublin': 'IRL',
  'prague': 'CZE',
  'budapest': 'HUN',
  'moscow': 'RUS',
  'st petersburg': 'RUS',
  'reykjavik': 'ISL',
  
  // North America - Countries
  'united states': 'USA',
  'usa': 'USA',
  'us': 'USA',
  'america': 'USA',
  'canada': 'CAN',
  'mexico': 'MEX',
  
  // North America - Major Cities
  'new york': 'USA',
  'los angeles': 'USA',
  'chicago': 'USA',
  'san francisco': 'USA',
  'las vegas': 'USA',
  'miami': 'USA',
  'washington': 'USA',
  'washington dc': 'USA',
  'boston': 'USA',
  'seattle': 'USA',
  'portland': 'USA',
  'denver': 'USA',
  'austin': 'USA',
  'houston': 'USA',
  'dallas': 'USA',
  'orlando': 'USA',
  'toronto': 'CAN',
  'vancouver': 'CAN',
  'montreal': 'CAN',
  'mexico city': 'MEX',
  'cancun': 'MEX',
  
  // South America - Countries
  'brazil': 'BRA',
  'argentina': 'ARG',
  'chile': 'CHL',
  'peru': 'PER',
  'colombia': 'COL',
  'ecuador': 'ECU',
  'bolivia': 'BOL',
  'uruguay': 'URY',
  'paraguay': 'PRY',
  'venezuela': 'VEN',
  
  // South America - Major Cities
  'rio de janeiro': 'BRA',
  'sao paulo': 'BRA',
  'buenos aires': 'ARG',
  'santiago': 'CHL',
  'lima': 'PER',
  'bogota': 'COL',
  'quito': 'ECU',
  'caracas': 'VEN',
  
  // Africa - Countries
  'egypt': 'EGY',
  'south africa': 'ZAF',
  'morocco': 'MAR',
  'kenya': 'KEN',
  'tanzania': 'TZA',
  'ethiopia': 'ETH',
  'nigeria': 'NGA',
  'ghana': 'GHA',
  'tunisia': 'TUN',
  'madagascar': 'MDG',
  'mauritius': 'MUS',
  'seychelles': 'SYC',
  
  // Africa - Major Cities
  'cairo': 'EGY',
  'cape town': 'ZAF',
  'johannesburg': 'ZAF',
  'marrakech': 'MAR',
  'casablanca': 'MAR',
  'nairobi': 'KEN',
  'lagos': 'NGA',
  'accra': 'GHA',
  
  // Oceania - Countries
  'australia': 'AUS',
  'new zealand': 'NZL',
  'fiji': 'FJI',
  
  // Oceania - Major Cities
  'sydney': 'AUS',
  'melbourne': 'AUS',
  'brisbane': 'AUS',
  'perth': 'AUS',
  'auckland': 'NZL',
  'wellington': 'NZL',
  
  // Middle East - Countries
  'united arab emirates': 'ARE',
  'uae': 'ARE',
  'saudi arabia': 'SAU',
  'qatar': 'QAT',
  'israel': 'ISR',
  'jordan': 'JOR',
  'lebanon': 'LBN',
  'oman': 'OMN',
  'kuwait': 'KWT',
  'bahrain': 'BHR',
  
  // Middle East - Major Cities
  'tel aviv': 'ISR',
  'jerusalem': 'ISR',
  'amman': 'JOR',
  'beirut': 'LBN',
  'doha': 'QAT',
  'riyadh': 'SAU',
  'muscat': 'OMN',
  
  // Caribbean & Central America
  'costa rica': 'CRI',
  'panama': 'PAN',
  'jamaica': 'JAM',
  'cuba': 'CUB',
  'dominican republic': 'DOM',
  'bahamas': 'BHS',
  'barbados': 'BRB',
  'trinidad and tobago': 'TTO',
};

/**
 * Get country code from destination string
 * Handles case-insensitive matching and returns null if not found
 */
export function getCountryCode(destination: string): string | null {
  if (!destination) return null;
  
  const normalized = destination.toLowerCase().trim();
  return DESTINATION_TO_COUNTRY_CODE[normalized] || null;
}

/**
 * Group trips by country and determine country status
 * Priority: active/booked > planning > completed
 */
export function groupTripsByCountry(trips: Trip[]): Map<string, CountryData> {
  const countryMap = new Map<string, CountryData>();
  
  trips.forEach(trip => {
    const countryCode = getCountryCode(trip.destination);
    if (!countryCode) return; // Skip if destination doesn't map to a country
    
    // Get or create country data
    if (!countryMap.has(countryCode)) {
      countryMap.set(countryCode, {
        countryCode,
        status: null,
        tripCount: 0,
        trips: [],
      });
    }
    
    const countryData = countryMap.get(countryCode)!;
    countryData.tripCount++;
    countryData.trips.push(trip);
    
    // Determine status priority: active/booked > planning > completed
    const currentStatus = countryData.status;
    const tripStatus = trip.status as 'planning' | 'booked' | 'completed';
    
    if (!currentStatus) {
      countryData.status = tripStatus;
    } else if (currentStatus === 'completed') {
      // Always override completed with any other status
      countryData.status = tripStatus;
    } else if (currentStatus === 'planning' && (tripStatus === 'booked' || tripStatus === 'completed')) {
      // Override planning with booked
      countryData.status = tripStatus;
    }
    // If current is booked/active, keep it (highest priority)
  });
  
  return countryMap;
}

/**
 * Get color for country based on trip status
 */
export function getCountryColor(status: 'planning' | 'booked' | 'completed' | null): string {
  if (!status) return '#E5E7EB'; // Gray-200 for countries with no trips
  
  switch (status) {
    case 'planning':
      return '#EF4444'; // Red-500
    case 'booked':
      return '#F59E0B'; // Amber-500
    case 'completed':
      return '#10B981'; // Green-500
    default:
      return '#E5E7EB'; // Gray-200
  }
}

/**
 * Get hover color (slightly lighter)
 */
export function getCountryHoverColor(status: 'planning' | 'booked' | 'completed' | null): string {
  if (!status) return '#D1D5DB'; // Gray-300
  
  switch (status) {
    case 'planning':
      return '#F87171'; // Red-400
    case 'booked':
      return '#FBBF24'; // Amber-400
    case 'completed':
      return '#34D399'; // Green-400
    default:
      return '#D1D5DB'; // Gray-300
  }
}