/**
 * Country Mapping Utility
 *
 * Maps destination names (countries, cities, regions) to ISO 3166-1 alpha-3 country codes.
 * Used for colouring countries on the world map based on trip destinations.
 */

import type { Trip, CountryData, TripStatus } from '../types';

// ── Static lookup table ───────────────────────────────────────────────────────
export const DESTINATION_TO_COUNTRY_CODE: Record<string, string> = {
  // Asia - Countries
  'japan': 'JPN', 'china': 'CHN', 'south korea': 'KOR', 'korea': 'KOR',
  'thailand': 'THA', 'singapore': 'SGP', 'malaysia': 'MYS', 'indonesia': 'IDN',
  'philippines': 'PHL', 'vietnam': 'VNM', 'india': 'IND', 'taiwan': 'TWN',
  'hong kong': 'HKG', 'cambodia': 'KHM', 'laos': 'LAO', 'myanmar': 'MMR',
  'burma': 'MMR', 'nepal': 'NPL', 'sri lanka': 'LKA', 'maldives': 'MDV',
  'bhutan': 'BTN', 'pakistan': 'PAK', 'bangladesh': 'BGD',

  // Asia - Major Cities
  'tokyo': 'JPN', 'osaka': 'JPN', 'kyoto': 'JPN', 'beijing': 'CHN',
  'shanghai': 'CHN', 'hongkong': 'HKG', 'seoul': 'KOR', 'bangkok': 'THA',
  'kuala lumpur': 'MYS', 'jakarta': 'IDN', 'bali': 'IDN', 'manila': 'PHL',
  'ho chi minh': 'VNM', 'hanoi': 'VNM', 'mumbai': 'IND', 'delhi': 'IND',
  'new delhi': 'IND', 'bangalore': 'IND', 'dubai': 'ARE', 'abu dhabi': 'ARE',
  'istanbul': 'TUR',

  // Europe - Countries
  'france': 'FRA', 'germany': 'DEU', 'italy': 'ITA', 'spain': 'ESP',
  'united kingdom': 'GBR', 'uk': 'GBR', 'england': 'GBR', 'scotland': 'GBR',
  'wales': 'GBR', 'netherlands': 'NLD', 'belgium': 'BEL', 'switzerland': 'CHE',
  'austria': 'AUT', 'portugal': 'PRT', 'greece': 'GRC', 'norway': 'NOR',
  'sweden': 'SWE', 'denmark': 'DNK', 'finland': 'FIN', 'ireland': 'IRL',
  'poland': 'POL', 'czech republic': 'CZE', 'czechia': 'CZE', 'hungary': 'HUN',
  'croatia': 'HRV', 'turkey': 'TUR', 'russia': 'RUS', 'iceland': 'ISL',
  'romania': 'ROU', 'bulgaria': 'BGR', 'estonia': 'EST', 'ukraine': 'UKR',
  'serbia': 'SRB', 'slovakia': 'SVK', 'slovenia': 'SVN', 'lithuania': 'LTU',
  'latvia': 'LVA',

  // Europe - Major Cities
  'paris': 'FRA', 'london': 'GBR', 'rome': 'ITA', 'milan': 'ITA',
  'venice': 'ITA', 'florence': 'ITA', 'barcelona': 'ESP', 'madrid': 'ESP',
  'berlin': 'DEU', 'munich': 'DEU', 'amsterdam': 'NLD', 'brussels': 'BEL',
  'zurich': 'CHE', 'geneva': 'CHE', 'vienna': 'AUT', 'lisbon': 'PRT',
  'athens': 'GRC', 'oslo': 'NOR', 'stockholm': 'SWE', 'copenhagen': 'DNK',
  'helsinki': 'FIN', 'dublin': 'IRL', 'prague': 'CZE', 'budapest': 'HUN',
  'moscow': 'RUS', 'st petersburg': 'RUS', 'saint petersburg': 'RUS',
  'reykjavik': 'ISL', 'tallinn': 'EST', 'kyiv': 'UKR', 'kiev': 'UKR',
  'warsaw': 'POL', 'krakow': 'POL', 'bucharest': 'ROU', 'sofia': 'BGR',
  'belgrade': 'SRB', 'bratislava': 'SVK', 'ljubljana': 'SVN',
  'vilnius': 'LTU', 'riga': 'LVA', 'zagreb': 'HRV',

  // North America
  'united states': 'USA', 'usa': 'USA', 'us': 'USA', 'america': 'USA',
  'canada': 'CAN', 'mexico': 'MEX',
  'new york': 'USA', 'los angeles': 'USA', 'chicago': 'USA',
  'san francisco': 'USA', 'las vegas': 'USA', 'miami': 'USA',
  'washington': 'USA', 'washington dc': 'USA', 'boston': 'USA',
  'seattle': 'USA', 'portland': 'USA', 'denver': 'USA', 'austin': 'USA',
  'houston': 'USA', 'dallas': 'USA', 'orlando': 'USA',
  'toronto': 'CAN', 'vancouver': 'CAN', 'montreal': 'CAN',
  'mexico city': 'MEX', 'cancun': 'MEX',

  // South America
  'brazil': 'BRA', 'argentina': 'ARG', 'chile': 'CHL', 'peru': 'PER',
  'colombia': 'COL', 'ecuador': 'ECU', 'bolivia': 'BOL', 'uruguay': 'URY',
  'paraguay': 'PRY', 'venezuela': 'VEN',
  'rio de janeiro': 'BRA', 'sao paulo': 'BRA', 'buenos aires': 'ARG',
  'santiago': 'CHL', 'lima': 'PER', 'bogota': 'COL', 'quito': 'ECU',
  'caracas': 'VEN',

  // Africa
  'egypt': 'EGY', 'south africa': 'ZAF', 'morocco': 'MAR', 'kenya': 'KEN',
  'tanzania': 'TZA', 'ethiopia': 'ETH', 'nigeria': 'NGA', 'ghana': 'GHA',
  'tunisia': 'TUN', 'madagascar': 'MDG', 'mauritius': 'MUS', 'seychelles': 'SYC',
  'cairo': 'EGY', 'cape town': 'ZAF', 'johannesburg': 'ZAF',
  'marrakech': 'MAR', 'casablanca': 'MAR', 'nairobi': 'KEN',
  'lagos': 'NGA', 'accra': 'GHA',

  // Oceania
  'australia': 'AUS', 'new zealand': 'NZL', 'fiji': 'FJI',
  'sydney': 'AUS', 'melbourne': 'AUS', 'brisbane': 'AUS', 'perth': 'AUS',
  'auckland': 'NZL', 'wellington': 'NZL',

  // Middle East
  'united arab emirates': 'ARE', 'uae': 'ARE', 'saudi arabia': 'SAU',
  'qatar': 'QAT', 'israel': 'ISR', 'jordan': 'JOR', 'lebanon': 'LBN',
  'oman': 'OMN', 'kuwait': 'KWT', 'bahrain': 'BHR',
  'tel aviv': 'ISR', 'jerusalem': 'ISR', 'amman': 'JOR', 'beirut': 'LBN',
  'doha': 'QAT', 'riyadh': 'SAU', 'muscat': 'OMN',

  // Caribbean & Central America
  'costa rica': 'CRI', 'panama': 'PAN', 'jamaica': 'JAM', 'cuba': 'CUB',
  'dominican republic': 'DOM', 'bahamas': 'BHS', 'barbados': 'BRB',
  'trinidad and tobago': 'TTO',
};

// ── Geo name → alpha-3 ────────────────────────────────────────────────────────
const GEO_NAME_TO_ALPHA3: Record<string, string> = {
  'Afghanistan': 'AFG', 'Albania': 'ALB', 'Algeria': 'DZA', 'Angola': 'AGO',
  'Argentina': 'ARG', 'Armenia': 'ARM', 'Australia': 'AUS', 'Austria': 'AUT',
  'Azerbaijan': 'AZE', 'Bahrain': 'BHR', 'Bangladesh': 'BGD', 'Belarus': 'BLR',
  'Belgium': 'BEL', 'Belize': 'BLZ', 'Benin': 'BEN', 'Bhutan': 'BTN',
  'Bolivia': 'BOL', 'Bosnia and Herz.': 'BIH', 'Botswana': 'BWA', 'Brazil': 'BRA',
  'Brunei': 'BRN', 'Bulgaria': 'BGR', 'Burkina Faso': 'BFA', 'Burundi': 'BDI',
  'Cambodia': 'KHM', 'Cameroon': 'CMR', 'Canada': 'CAN', 'Chad': 'TCD',
  'Chile': 'CHL', 'China': 'CHN', 'Colombia': 'COL', 'Congo': 'COG',
  'Costa Rica': 'CRI', 'Croatia': 'HRV', 'Cuba': 'CUB', 'Cyprus': 'CYP',
  'Czech Rep.': 'CZE', 'Czechia': 'CZE', 'Dem. Rep. Congo': 'COD',
  'Denmark': 'DNK', 'Dominican Rep.': 'DOM', 'Ecuador': 'ECU', 'Egypt': 'EGY',
  'El Salvador': 'SLV', 'Estonia': 'EST', 'Ethiopia': 'ETH', 'Fiji': 'FJI',
  'Finland': 'FIN', 'France': 'FRA', 'Gabon': 'GAB', 'Georgia': 'GEO',
  'Germany': 'DEU', 'Ghana': 'GHA', 'Greece': 'GRC', 'Guatemala': 'GTM',
  'Guinea': 'GIN', 'Haiti': 'HTI', 'Honduras': 'HND', 'Hungary': 'HUN',
  'Iceland': 'ISL', 'India': 'IND', 'Indonesia': 'IDN', 'Iran': 'IRN',
  'Iraq': 'IRQ', 'Ireland': 'IRL', 'Israel': 'ISR', 'Italy': 'ITA',
  'Ivory Coast': 'CIV', 'Jamaica': 'JAM', 'Japan': 'JPN', 'Jordan': 'JOR',
  'Kazakhstan': 'KAZ', 'Kenya': 'KEN', 'Kosovo': 'XKX', 'Kuwait': 'KWT',
  'Kyrgyzstan': 'KGZ', 'Laos': 'LAO', 'Latvia': 'LVA', 'Lebanon': 'LBN',
  'Libya': 'LBY', 'Lithuania': 'LTU', 'Luxembourg': 'LUX', 'Macedonia': 'MKD',
  'Madagascar': 'MDG', 'Malawi': 'MWI', 'Malaysia': 'MYS', 'Mali': 'MLI',
  'Mauritania': 'MRT', 'Mexico': 'MEX', 'Moldova': 'MDA', 'Mongolia': 'MNG',
  'Montenegro': 'MNE', 'Morocco': 'MAR', 'Mozambique': 'MOZ', 'Myanmar': 'MMR',
  'Namibia': 'NAM', 'Nepal': 'NPL', 'Netherlands': 'NLD', 'New Zealand': 'NZL',
  'Nicaragua': 'NIC', 'Niger': 'NER', 'Nigeria': 'NGA', 'North Korea': 'PRK',
  'Norway': 'NOR', 'Oman': 'OMN', 'Pakistan': 'PAK', 'Panama': 'PAN',
  'Papua New Guinea': 'PNG', 'Paraguay': 'PRY', 'Peru': 'PER', 'Philippines': 'PHL',
  'Poland': 'POL', 'Portugal': 'PRT', 'Qatar': 'QAT', 'Romania': 'ROU',
  'Russia': 'RUS', 'Rwanda': 'RWA', 'Saudi Arabia': 'SAU', 'Senegal': 'SEN',
  'Serbia': 'SRB', 'Sierra Leone': 'SLE', 'Slovakia': 'SVK', 'Slovenia': 'SVN',
  'Somalia': 'SOM', 'South Africa': 'ZAF', 'South Korea': 'KOR',
  'South Sudan': 'SSD', 'Spain': 'ESP', 'Sri Lanka': 'LKA', 'Sudan': 'SDN',
  'Sweden': 'SWE', 'Switzerland': 'CHE', 'Syria': 'SYR', 'Taiwan': 'TWN',
  'Tajikistan': 'TJK', 'Tanzania': 'TZA', 'Thailand': 'THA', 'Togo': 'TGO',
  'Tunisia': 'TUN', 'Turkey': 'TUR', 'Turkmenistan': 'TKM', 'Uganda': 'UGA',
  'Ukraine': 'UKR', 'United Arab Emirates': 'ARE', 'United Kingdom': 'GBR',
  'United States of America': 'USA', 'Uruguay': 'URY', 'Uzbekistan': 'UZB',
  'Venezuela': 'VEN', 'Vietnam': 'VNM', 'Yemen': 'YEM', 'Zambia': 'ZMB',
  'Zimbabwe': 'ZWE',
};

export function getAlpha3FromGeoName(geoName: string): string | null {
  return GEO_NAME_TO_ALPHA3[geoName] ?? null;
}

/**
 * Get alpha-3 country code from a trip destination string.
 * Falls back to static lookup table.
 */
export function getCountryCode(destination: string): string | null {
  if (!destination) return null;
  const normalized = destination.toLowerCase().trim();
  return DESTINATION_TO_COUNTRY_CODE[normalized] ?? null;
}

// Status priority for map colouring: ongoing > booked > planning > completed > cancelled
const STATUS_PRIORITY: Record<TripStatus, number> = {
  ongoing:   5,
  booked:    4,
  planning:  3,
  completed: 2,
  cancelled: 1,
};

/**
 * Group trips by country and determine country status.
 * Higher priority status wins when a country has multiple trips.
 */
export function groupTripsByCountry(trips: Trip[]): Map<string, CountryData> {
  const countryMap = new Map<string, CountryData>();

  trips.forEach((trip) => {
    const countryCode = getCountryCode(trip.destination);
    if (!countryCode) return;

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

    // Replace status if this trip has higher priority
    const currentPriority = countryData.status ? STATUS_PRIORITY[countryData.status] : 0;
    const tripPriority = STATUS_PRIORITY[trip.status] ?? 0;
    if (tripPriority > currentPriority) {
      countryData.status = trip.status;
    }
  });

  return countryMap;
}

/**
 * Get fill color for a country based on trip status.
 */
export function getCountryColor(status: TripStatus | null): string {
  if (!status) return '#E5E7EB';
  switch (status) {
    case 'ongoing':   return '#7C3AED';
    case 'booked':    return '#F59E0B';
    case 'planning':  return '#EF4444';
    case 'completed': return '#10B981';
    case 'cancelled': return '#9CA3AF';
    default:          return '#E5E7EB';
  }
}

/**
 * Get hover color (slightly lighter).
 */
export function getCountryHoverColor(status: TripStatus | null): string {
  if (!status) return '#D1D5DB';
  switch (status) {
    case 'ongoing':   return '#8B5CF6';
    case 'booked':    return '#FBBF24';
    case 'planning':  return '#F87171';
    case 'completed': return '#34D399';
    case 'cancelled': return '#D1D5DB';
    default:          return '#D1D5DB';
  }
}