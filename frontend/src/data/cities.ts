export interface CityEntry {
  city:         string;
  country:      string;
  country_code: string;
}

export const CITIES: CityEntry[] = [
  // ── Singapore ────────────────────────────────────────────────
  { city: "Singapore",            country: "Singapore",           country_code: "SG" },

  // ── Malaysia ─────────────────────────────────────────────────
  { city: "Kuala Lumpur",         country: "Malaysia",            country_code: "MY" },
  { city: "Penang",               country: "Malaysia",            country_code: "MY" },
  { city: "Langkawi",             country: "Malaysia",            country_code: "MY" },
  { city: "Kota Kinabalu",        country: "Malaysia",            country_code: "MY" },
  { city: "Malacca",              country: "Malaysia",            country_code: "MY" },
  { city: "Johor Bahru",          country: "Malaysia",            country_code: "MY" },
  { city: "Ipoh",                 country: "Malaysia",            country_code: "MY" },

  // ── Thailand ──────────────────────────────────────────────────
  { city: "Bangkok",              country: "Thailand",            country_code: "TH" },
  { city: "Chiang Mai",           country: "Thailand",            country_code: "TH" },
  { city: "Phuket",               country: "Thailand",            country_code: "TH" },
  { city: "Pattaya",              country: "Thailand",            country_code: "TH" },
  { city: "Koh Samui",            country: "Thailand",            country_code: "TH" },
  { city: "Krabi",                country: "Thailand",            country_code: "TH" },
  { city: "Chiang Rai",           country: "Thailand",            country_code: "TH" },
  { city: "Hua Hin",              country: "Thailand",            country_code: "TH" },
  { city: "Koh Phi Phi",          country: "Thailand",            country_code: "TH" },
  { city: "Pai",                  country: "Thailand",            country_code: "TH" },

  // ── Indonesia ────────────────────────────────────────────────
  { city: "Jakarta",              country: "Indonesia",           country_code: "ID" },
  { city: "Bali",                 country: "Indonesia",           country_code: "ID" },
  { city: "Yogyakarta",           country: "Indonesia",           country_code: "ID" },
  { city: "Surabaya",             country: "Indonesia",           country_code: "ID" },
  { city: "Lombok",               country: "Indonesia",           country_code: "ID" },
  { city: "Medan",                country: "Indonesia",           country_code: "ID" },
  { city: "Bandung",              country: "Indonesia",           country_code: "ID" },
  { city: "Labuan Bajo",          country: "Indonesia",           country_code: "ID" },
  { city: "Raja Ampat",           country: "Indonesia",           country_code: "ID" },

  // ── Vietnam ──────────────────────────────────────────────────
  { city: "Ho Chi Minh City",     country: "Vietnam",             country_code: "VN" },
  { city: "Hanoi",                country: "Vietnam",             country_code: "VN" },
  { city: "Da Nang",              country: "Vietnam",             country_code: "VN" },
  { city: "Hoi An",               country: "Vietnam",             country_code: "VN" },
  { city: "Hue",                  country: "Vietnam",             country_code: "VN" },
  { city: "Nha Trang",            country: "Vietnam",             country_code: "VN" },
  { city: "Ha Long Bay",          country: "Vietnam",             country_code: "VN" },
  { city: "Sapa",                 country: "Vietnam",             country_code: "VN" },
  { city: "Phu Quoc",             country: "Vietnam",             country_code: "VN" },
  { city: "Da Lat",               country: "Vietnam",             country_code: "VN" },

  // ── Philippines ──────────────────────────────────────────────
  { city: "Manila",               country: "Philippines",         country_code: "PH" },
  { city: "Cebu",                 country: "Philippines",         country_code: "PH" },
  { city: "Davao",                country: "Philippines",         country_code: "PH" },
  { city: "Boracay",              country: "Philippines",         country_code: "PH" },
  { city: "Palawan",              country: "Philippines",         country_code: "PH" },
  { city: "Bohol",                country: "Philippines",         country_code: "PH" },
  { city: "Siargao",              country: "Philippines",         country_code: "PH" },

  // ── Cambodia ─────────────────────────────────────────────────
  { city: "Phnom Penh",           country: "Cambodia",            country_code: "KH" },
  { city: "Siem Reap",            country: "Cambodia",            country_code: "KH" },
  { city: "Sihanoukville",        country: "Cambodia",            country_code: "KH" },

  // ── Myanmar ──────────────────────────────────────────────────
  { city: "Yangon",               country: "Myanmar",             country_code: "MM" },
  { city: "Mandalay",             country: "Myanmar",             country_code: "MM" },
  { city: "Bagan",                country: "Myanmar",             country_code: "MM" },
  { city: "Inle Lake",            country: "Myanmar",             country_code: "MM" },

  // ── Laos ─────────────────────────────────────────────────────
  { city: "Vientiane",            country: "Laos",                country_code: "LA" },
  { city: "Luang Prabang",        country: "Laos",                country_code: "LA" },
  { city: "Vang Vieng",           country: "Laos",                country_code: "LA" },

  // ── Brunei ───────────────────────────────────────────────────
  { city: "Bandar Seri Begawan",  country: "Brunei",              country_code: "BN" },

  // ── Timor-Leste ──────────────────────────────────────────────
  { city: "Dili",                 country: "Timor-Leste",         country_code: "TL" },

  // ── Japan ────────────────────────────────────────────────────
  { city: "Tokyo",                country: "Japan",               country_code: "JP" },
  { city: "Osaka",                country: "Japan",               country_code: "JP" },
  { city: "Kyoto",                country: "Japan",               country_code: "JP" },
  { city: "Hiroshima",            country: "Japan",               country_code: "JP" },
  { city: "Fukuoka",              country: "Japan",               country_code: "JP" },
  { city: "Sapporo",              country: "Japan",               country_code: "JP" },
  { city: "Nara",                 country: "Japan",               country_code: "JP" },
  { city: "Nagoya",               country: "Japan",               country_code: "JP" },
  { city: "Kobe",                 country: "Japan",               country_code: "JP" },
  { city: "Yokohama",             country: "Japan",               country_code: "JP" },
  { city: "Okinawa",              country: "Japan",               country_code: "JP" },
  { city: "Nikko",                country: "Japan",               country_code: "JP" },
  { city: "Hakone",               country: "Japan",               country_code: "JP" },
  { city: "Kanazawa",             country: "Japan",               country_code: "JP" },
  { city: "Nagasaki",             country: "Japan",               country_code: "JP" },
  { city: "Sendai",               country: "Japan",               country_code: "JP" },
  { city: "Kumamoto",             country: "Japan",               country_code: "JP" },

  // ── South Korea ──────────────────────────────────────────────
  { city: "Seoul",                country: "South Korea",         country_code: "KR" },
  { city: "Busan",                country: "South Korea",         country_code: "KR" },
  { city: "Jeju",                 country: "South Korea",         country_code: "KR" },
  { city: "Incheon",              country: "South Korea",         country_code: "KR" },
  { city: "Gyeongju",             country: "South Korea",         country_code: "KR" },
  { city: "Jeonju",               country: "South Korea",         country_code: "KR" },

  // ── China ────────────────────────────────────────────────────
  { city: "Beijing",              country: "China",               country_code: "CN" },
  { city: "Shanghai",             country: "China",               country_code: "CN" },
  { city: "Guangzhou",            country: "China",               country_code: "CN" },
  { city: "Shenzhen",             country: "China",               country_code: "CN" },
  { city: "Chengdu",              country: "China",               country_code: "CN" },
  { city: "Xi'an",                country: "China",               country_code: "CN" },
  { city: "Guilin",               country: "China",               country_code: "CN" },
  { city: "Hangzhou",             country: "China",               country_code: "CN" },
  { city: "Suzhou",               country: "China",               country_code: "CN" },
  { city: "Nanjing",              country: "China",               country_code: "CN" },
  { city: "Harbin",               country: "China",               country_code: "CN" },
  { city: "Kunming",              country: "China",               country_code: "CN" },
  { city: "Lijiang",              country: "China",               country_code: "CN" },
  { city: "Zhangjiajie",          country: "China",               country_code: "CN" },
  { city: "Lhasa",                country: "China",               country_code: "CN" },
  { city: "Chongqing",            country: "China",               country_code: "CN" },
  { city: "Xiamen",               country: "China",               country_code: "CN" },
  { city: "Qingdao",              country: "China",               country_code: "CN" },

  // ── Hong Kong ────────────────────────────────────────────────
  { city: "Hong Kong",            country: "Hong Kong",           country_code: "HK" },

  // ── Macau ────────────────────────────────────────────────────
  { city: "Macau",                country: "Macau",               country_code: "MO" },

  // ── Taiwan ───────────────────────────────────────────────────
  { city: "Taipei",               country: "Taiwan",              country_code: "TW" },
  { city: "Kaohsiung",            country: "Taiwan",              country_code: "TW" },
  { city: "Tainan",               country: "Taiwan",              country_code: "TW" },
  { city: "Taichung",             country: "Taiwan",              country_code: "TW" },
  { city: "Hualien",              country: "Taiwan",              country_code: "TW" },

  // ── Mongolia ─────────────────────────────────────────────────
  { city: "Ulaanbaatar",          country: "Mongolia",            country_code: "MN" },

  // ── India ────────────────────────────────────────────────────
  { city: "Mumbai",               country: "India",               country_code: "IN" },
  { city: "New Delhi",            country: "India",               country_code: "IN" },
  { city: "Delhi",                country: "India",               country_code: "IN" },
  { city: "Bangalore",            country: "India",               country_code: "IN" },
  { city: "Chennai",              country: "India",               country_code: "IN" },
  { city: "Kolkata",              country: "India",               country_code: "IN" },
  { city: "Hyderabad",            country: "India",               country_code: "IN" },
  { city: "Jaipur",               country: "India",               country_code: "IN" },
  { city: "Agra",                 country: "India",               country_code: "IN" },
  { city: "Varanasi",             country: "India",               country_code: "IN" },
  { city: "Goa",                  country: "India",               country_code: "IN" },
  { city: "Udaipur",              country: "India",               country_code: "IN" },
  { city: "Amritsar",             country: "India",               country_code: "IN" },
  { city: "Jodhpur",              country: "India",               country_code: "IN" },
  { city: "Kochi",                country: "India",               country_code: "IN" },
  { city: "Mysore",               country: "India",               country_code: "IN" },
  { city: "Rishikesh",            country: "India",               country_code: "IN" },
  { city: "Darjeeling",           country: "India",               country_code: "IN" },
  { city: "Shimla",               country: "India",               country_code: "IN" },
  { city: "Pushkar",              country: "India",               country_code: "IN" },

  // ── Sri Lanka ────────────────────────────────────────────────
  { city: "Colombo",              country: "Sri Lanka",           country_code: "LK" },
  { city: "Kandy",                country: "Sri Lanka",           country_code: "LK" },
  { city: "Galle",                country: "Sri Lanka",           country_code: "LK" },
  { city: "Sigiriya",             country: "Sri Lanka",           country_code: "LK" },

  // ── Nepal ────────────────────────────────────────────────────
  { city: "Kathmandu",            country: "Nepal",               country_code: "NP" },
  { city: "Pokhara",              country: "Nepal",               country_code: "NP" },
  { city: "Chitwan",              country: "Nepal",               country_code: "NP" },

  // ── Bhutan ───────────────────────────────────────────────────
  { city: "Thimphu",              country: "Bhutan",              country_code: "BT" },
  { city: "Paro",                 country: "Bhutan",              country_code: "BT" },

  // ── Bangladesh ───────────────────────────────────────────────
  { city: "Dhaka",                country: "Bangladesh",          country_code: "BD" },
  { city: "Chittagong",           country: "Bangladesh",          country_code: "BD" },

  // ── Pakistan ─────────────────────────────────────────────────
  { city: "Karachi",              country: "Pakistan",            country_code: "PK" },
  { city: "Lahore",               country: "Pakistan",            country_code: "PK" },
  { city: "Islamabad",            country: "Pakistan",            country_code: "PK" },
  { city: "Peshawar",             country: "Pakistan",            country_code: "PK" },

  // ── Maldives ─────────────────────────────────────────────────
  { city: "Malé",                 country: "Maldives",            country_code: "MV" },

  // ── UAE ──────────────────────────────────────────────────────
  { city: "Dubai",                country: "United Arab Emirates", country_code: "AE" },
  { city: "Abu Dhabi",            country: "United Arab Emirates", country_code: "AE" },
  { city: "Sharjah",              country: "United Arab Emirates", country_code: "AE" },

  // ── Qatar ────────────────────────────────────────────────────
  { city: "Doha",                 country: "Qatar",               country_code: "QA" },

  // ── Saudi Arabia ─────────────────────────────────────────────
  { city: "Riyadh",               country: "Saudi Arabia",        country_code: "SA" },
  { city: "Jeddah",               country: "Saudi Arabia",        country_code: "SA" },
  { city: "AlUla",                country: "Saudi Arabia",        country_code: "SA" },

  // ── Kuwait ───────────────────────────────────────────────────
  { city: "Kuwait City",          country: "Kuwait",              country_code: "KW" },

  // ── Bahrain ──────────────────────────────────────────────────
  { city: "Manama",               country: "Bahrain",             country_code: "BH" },

  // ── Oman ─────────────────────────────────────────────────────
  { city: "Muscat",               country: "Oman",                country_code: "OM" },
  { city: "Salalah",              country: "Oman",                country_code: "OM" },

  // ── Jordan ───────────────────────────────────────────────────
  { city: "Amman",                country: "Jordan",              country_code: "JO" },
  { city: "Petra",                country: "Jordan",              country_code: "JO" },
  { city: "Aqaba",                country: "Jordan",              country_code: "JO" },
  { city: "Wadi Rum",             country: "Jordan",              country_code: "JO" },

  // ── Lebanon ──────────────────────────────────────────────────
  { city: "Beirut",               country: "Lebanon",             country_code: "LB" },

  // ── Israel ───────────────────────────────────────────────────
  { city: "Tel Aviv",             country: "Israel",              country_code: "IL" },
  { city: "Jerusalem",            country: "Israel",              country_code: "IL" },
  { city: "Haifa",                country: "Israel",              country_code: "IL" },
  { city: "Eilat",                country: "Israel",              country_code: "IL" },

  // ── Turkey ───────────────────────────────────────────────────
  { city: "Istanbul",             country: "Turkey",              country_code: "TR" },
  { city: "Ankara",               country: "Turkey",              country_code: "TR" },
  { city: "Cappadocia",           country: "Turkey",              country_code: "TR" },
  { city: "Antalya",              country: "Turkey",              country_code: "TR" },
  { city: "Bodrum",               country: "Turkey",              country_code: "TR" },
  { city: "Izmir",                country: "Turkey",              country_code: "TR" },
  { city: "Pamukkale",            country: "Turkey",              country_code: "TR" },
  { city: "Trabzon",              country: "Turkey",              country_code: "TR" },

  // ── Egypt ────────────────────────────────────────────────────
  { city: "Cairo",                country: "Egypt",               country_code: "EG" },
  { city: "Luxor",                country: "Egypt",               country_code: "EG" },
  { city: "Aswan",                country: "Egypt",               country_code: "EG" },
  { city: "Hurghada",             country: "Egypt",               country_code: "EG" },
  { city: "Sharm el-Sheikh",      country: "Egypt",               country_code: "EG" },
  { city: "Alexandria",           country: "Egypt",               country_code: "EG" },

  // ── Morocco ──────────────────────────────────────────────────
  { city: "Marrakech",            country: "Morocco",             country_code: "MA" },
  { city: "Casablanca",           country: "Morocco",             country_code: "MA" },
  { city: "Fez",                  country: "Morocco",             country_code: "MA" },
  { city: "Rabat",                country: "Morocco",             country_code: "MA" },
  { city: "Tangier",              country: "Morocco",             country_code: "MA" },
  { city: "Agadir",               country: "Morocco",             country_code: "MA" },
  { city: "Chefchaouen",          country: "Morocco",             country_code: "MA" },
  { city: "Essaouira",            country: "Morocco",             country_code: "MA" },

  // ── Tunisia ──────────────────────────────────────────────────
  { city: "Tunis",                country: "Tunisia",             country_code: "TN" },
  { city: "Djerba",               country: "Tunisia",             country_code: "TN" },
  { city: "Sousse",               country: "Tunisia",             country_code: "TN" },

  // ── Kenya ────────────────────────────────────────────────────
  { city: "Nairobi",              country: "Kenya",               country_code: "KE" },
  { city: "Mombasa",              country: "Kenya",               country_code: "KE" },
  { city: "Masai Mara",           country: "Kenya",               country_code: "KE" },

  // ── Tanzania ─────────────────────────────────────────────────
  { city: "Dar es Salaam",        country: "Tanzania",            country_code: "TZ" },
  { city: "Zanzibar",             country: "Tanzania",            country_code: "TZ" },
  { city: "Arusha",               country: "Tanzania",            country_code: "TZ" },
  { city: "Serengeti",            country: "Tanzania",            country_code: "TZ" },

  // ── Uganda ───────────────────────────────────────────────────
  { city: "Kampala",              country: "Uganda",              country_code: "UG" },

  // ── Rwanda ───────────────────────────────────────────────────
  { city: "Kigali",               country: "Rwanda",              country_code: "RW" },

  // ── Ethiopia ─────────────────────────────────────────────────
  { city: "Addis Ababa",          country: "Ethiopia",            country_code: "ET" },
  { city: "Lalibela",             country: "Ethiopia",            country_code: "ET" },

  // ── South Africa ─────────────────────────────────────────────
  { city: "Cape Town",            country: "South Africa",        country_code: "ZA" },
  { city: "Johannesburg",         country: "South Africa",        country_code: "ZA" },
  { city: "Durban",               country: "South Africa",        country_code: "ZA" },
  { city: "Stellenbosch",         country: "South Africa",        country_code: "ZA" },
  { city: "Kruger National Park", country: "South Africa",        country_code: "ZA" },

  // ── Zimbabwe ─────────────────────────────────────────────────
  { city: "Harare",               country: "Zimbabwe",            country_code: "ZW" },
  { city: "Victoria Falls",       country: "Zimbabwe",            country_code: "ZW" },

  // ── Zambia ───────────────────────────────────────────────────
  { city: "Lusaka",               country: "Zambia",              country_code: "ZM" },

  // ── Botswana ─────────────────────────────────────────────────
  { city: "Gaborone",             country: "Botswana",            country_code: "BW" },
  { city: "Okavango Delta",       country: "Botswana",            country_code: "BW" },

  // ── Namibia ──────────────────────────────────────────────────
  { city: "Windhoek",             country: "Namibia",             country_code: "NA" },

  // ── Ghana ────────────────────────────────────────────────────
  { city: "Accra",                country: "Ghana",               country_code: "GH" },

  // ── Nigeria ──────────────────────────────────────────────────
  { city: "Lagos",                country: "Nigeria",             country_code: "NG" },
  { city: "Abuja",                country: "Nigeria",             country_code: "NG" },

  // ── Senegal ──────────────────────────────────────────────────
  { city: "Dakar",                country: "Senegal",             country_code: "SN" },

  // ── Côte d'Ivoire ────────────────────────────────────────────
  { city: "Abidjan",              country: "Côte d'Ivoire",       country_code: "CI" },

  // ── Madagascar ───────────────────────────────────────────────
  { city: "Antananarivo",         country: "Madagascar",          country_code: "MG" },

  // ── Mauritius ────────────────────────────────────────────────
  { city: "Port Louis",           country: "Mauritius",           country_code: "MU" },

  // ── Seychelles ───────────────────────────────────────────────
  { city: "Victoria",             country: "Seychelles",          country_code: "SC" },

  // ── Réunion ──────────────────────────────────────────────────
  { city: "Saint-Denis",          country: "Réunion",             country_code: "RE" },

  // ── UK ───────────────────────────────────────────────────────
  { city: "London",               country: "United Kingdom",      country_code: "GB" },
  { city: "Edinburgh",            country: "United Kingdom",      country_code: "GB" },
  { city: "Manchester",           country: "United Kingdom",      country_code: "GB" },
  { city: "Liverpool",            country: "United Kingdom",      country_code: "GB" },
  { city: "Birmingham",           country: "United Kingdom",      country_code: "GB" },
  { city: "Glasgow",              country: "United Kingdom",      country_code: "GB" },
  { city: "Bristol",              country: "United Kingdom",      country_code: "GB" },
  { city: "Oxford",               country: "United Kingdom",      country_code: "GB" },
  { city: "Cambridge",            country: "United Kingdom",      country_code: "GB" },
  { city: "Bath",                 country: "United Kingdom",      country_code: "GB" },
  { city: "York",                 country: "United Kingdom",      country_code: "GB" },
  { city: "Cardiff",              country: "United Kingdom",      country_code: "GB" },

  // ── Ireland ──────────────────────────────────────────────────
  { city: "Dublin",               country: "Ireland",             country_code: "IE" },
  { city: "Galway",               country: "Ireland",             country_code: "IE" },
  { city: "Cork",                 country: "Ireland",             country_code: "IE" },
  { city: "Killarney",            country: "Ireland",             country_code: "IE" },

  // ── France ───────────────────────────────────────────────────
  { city: "Paris",                country: "France",              country_code: "FR" },
  { city: "Lyon",                 country: "France",              country_code: "FR" },
  { city: "Marseille",            country: "France",              country_code: "FR" },
  { city: "Nice",                 country: "France",              country_code: "FR" },
  { city: "Bordeaux",             country: "France",              country_code: "FR" },
  { city: "Toulouse",             country: "France",              country_code: "FR" },
  { city: "Strasbourg",           country: "France",              country_code: "FR" },
  { city: "Cannes",               country: "France",              country_code: "FR" },
  { city: "Normandy",             country: "France",              country_code: "FR" },
  { city: "Mont Saint-Michel",    country: "France",              country_code: "FR" },
  { city: "Nantes",               country: "France",              country_code: "FR" },
  { city: "Annecy",               country: "France",              country_code: "FR" },

  // ── Monaco ───────────────────────────────────────────────────
  { city: "Monaco",               country: "Monaco",              country_code: "MC" },

  // ── Spain ────────────────────────────────────────────────────
  { city: "Madrid",               country: "Spain",               country_code: "ES" },
  { city: "Barcelona",            country: "Spain",               country_code: "ES" },
  { city: "Seville",              country: "Spain",               country_code: "ES" },
  { city: "Granada",              country: "Spain",               country_code: "ES" },
  { city: "Valencia",             country: "Spain",               country_code: "ES" },
  { city: "Bilbao",               country: "Spain",               country_code: "ES" },
  { city: "San Sebastián",        country: "Spain",               country_code: "ES" },
  { city: "Málaga",               country: "Spain",               country_code: "ES" },
  { city: "Palma",                country: "Spain",               country_code: "ES" },
  { city: "Ibiza",                country: "Spain",               country_code: "ES" },
  { city: "Tenerife",             country: "Spain",               country_code: "ES" },
  { city: "Toledo",               country: "Spain",               country_code: "ES" },
  { city: "Córdoba",              country: "Spain",               country_code: "ES" },
  { city: "Zaragoza",             country: "Spain",               country_code: "ES" },

  // ── Portugal ─────────────────────────────────────────────────
  { city: "Lisbon",               country: "Portugal",            country_code: "PT" },
  { city: "Porto",                country: "Portugal",            country_code: "PT" },
  { city: "Algarve",              country: "Portugal",            country_code: "PT" },
  { city: "Sintra",               country: "Portugal",            country_code: "PT" },
  { city: "Funchal",              country: "Portugal",            country_code: "PT" },
  { city: "Ponta Delgada",        country: "Portugal",            country_code: "PT" },

  // ── Italy ────────────────────────────────────────────────────
  { city: "Rome",                 country: "Italy",               country_code: "IT" },
  { city: "Milan",                country: "Italy",               country_code: "IT" },
  { city: "Venice",               country: "Italy",               country_code: "IT" },
  { city: "Florence",             country: "Italy",               country_code: "IT" },
  { city: "Naples",               country: "Italy",               country_code: "IT" },
  { city: "Turin",                country: "Italy",               country_code: "IT" },
  { city: "Bologna",              country: "Italy",               country_code: "IT" },
  { city: "Verona",               country: "Italy",               country_code: "IT" },
  { city: "Amalfi",               country: "Italy",               country_code: "IT" },
  { city: "Positano",             country: "Italy",               country_code: "IT" },
  { city: "Cinque Terre",         country: "Italy",               country_code: "IT" },
  { city: "Palermo",              country: "Italy",               country_code: "IT" },
  { city: "Catania",              country: "Italy",               country_code: "IT" },
  { city: "Bari",                 country: "Italy",               country_code: "IT" },
  { city: "Lecce",                country: "Italy",               country_code: "IT" },
  { city: "Cagliari",             country: "Italy",               country_code: "IT" },

  // ── Vatican ──────────────────────────────────────────────────
  { city: "Vatican City",         country: "Vatican City",        country_code: "VA" },

  // ── Germany ──────────────────────────────────────────────────
  { city: "Berlin",               country: "Germany",             country_code: "DE" },
  { city: "Munich",               country: "Germany",             country_code: "DE" },
  { city: "Hamburg",              country: "Germany",             country_code: "DE" },
  { city: "Frankfurt",            country: "Germany",             country_code: "DE" },
  { city: "Cologne",              country: "Germany",             country_code: "DE" },
  { city: "Stuttgart",            country: "Germany",             country_code: "DE" },
  { city: "Dresden",              country: "Germany",             country_code: "DE" },
  { city: "Leipzig",              country: "Germany",             country_code: "DE" },
  { city: "Heidelberg",           country: "Germany",             country_code: "DE" },
  { city: "Rothenburg",           country: "Germany",             country_code: "DE" },
  { city: "Düsseldorf",           country: "Germany",             country_code: "DE" },
  { city: "Nuremberg",            country: "Germany",             country_code: "DE" },

  // ── Austria ──────────────────────────────────────────────────
  { city: "Vienna",               country: "Austria",             country_code: "AT" },
  { city: "Salzburg",             country: "Austria",             country_code: "AT" },
  { city: "Innsbruck",            country: "Austria",             country_code: "AT" },
  { city: "Graz",                 country: "Austria",             country_code: "AT" },
  { city: "Hallstatt",            country: "Austria",             country_code: "AT" },

  // ── Switzerland ──────────────────────────────────────────────
  { city: "Zurich",               country: "Switzerland",         country_code: "CH" },
  { city: "Geneva",               country: "Switzerland",         country_code: "CH" },
  { city: "Bern",                 country: "Switzerland",         country_code: "CH" },
  { city: "Lucerne",              country: "Switzerland",         country_code: "CH" },
  { city: "Interlaken",           country: "Switzerland",         country_code: "CH" },
  { city: "Zermatt",              country: "Switzerland",         country_code: "CH" },
  { city: "Lausanne",             country: "Switzerland",         country_code: "CH" },
  { city: "Basel",                country: "Switzerland",         country_code: "CH" },

  // ── Netherlands ──────────────────────────────────────────────
  { city: "Amsterdam",            country: "Netherlands",         country_code: "NL" },
  { city: "Rotterdam",            country: "Netherlands",         country_code: "NL" },
  { city: "The Hague",            country: "Netherlands",         country_code: "NL" },
  { city: "Utrecht",              country: "Netherlands",         country_code: "NL" },

  // ── Belgium ──────────────────────────────────────────────────
  { city: "Brussels",             country: "Belgium",             country_code: "BE" },
  { city: "Bruges",               country: "Belgium",             country_code: "BE" },
  { city: "Ghent",                country: "Belgium",             country_code: "BE" },
  { city: "Antwerp",              country: "Belgium",             country_code: "BE" },

  // ── Luxembourg ───────────────────────────────────────────────
  { city: "Luxembourg City",      country: "Luxembourg",          country_code: "LU" },

  // ── Denmark ──────────────────────────────────────────────────
  { city: "Copenhagen",           country: "Denmark",             country_code: "DK" },
  { city: "Aarhus",               country: "Denmark",             country_code: "DK" },

  // ── Sweden ───────────────────────────────────────────────────
  { city: "Stockholm",            country: "Sweden",              country_code: "SE" },
  { city: "Gothenburg",           country: "Sweden",              country_code: "SE" },
  { city: "Malmö",                country: "Sweden",              country_code: "SE" },

  // ── Norway ───────────────────────────────────────────────────
  { city: "Oslo",                 country: "Norway",              country_code: "NO" },
  { city: "Bergen",               country: "Norway",              country_code: "NO" },
  { city: "Tromsø",               country: "Norway",              country_code: "NO" },
  { city: "Stavanger",            country: "Norway",              country_code: "NO" },
  { city: "Flåm",                 country: "Norway",              country_code: "NO" },

  // ── Finland ──────────────────────────────────────────────────
  { city: "Helsinki",             country: "Finland",             country_code: "FI" },
  { city: "Rovaniemi",            country: "Finland",             country_code: "FI" },
  { city: "Tampere",              country: "Finland",             country_code: "FI" },
  { city: "Turku",                country: "Finland",             country_code: "FI" },

  // ── Iceland ──────────────────────────────────────────────────
  { city: "Reykjavik",            country: "Iceland",             country_code: "IS" },
  { city: "Akureyri",             country: "Iceland",             country_code: "IS" },

  // ── Faroe Islands ────────────────────────────────────────────
  { city: "Tórshavn",             country: "Faroe Islands",       country_code: "FO" },

  // ── Estonia ──────────────────────────────────────────────────
  { city: "Tallinn",              country: "Estonia",             country_code: "EE" },
  { city: "Tartu",                country: "Estonia",             country_code: "EE" },

  // ── Latvia ───────────────────────────────────────────────────
  { city: "Riga",                 country: "Latvia",              country_code: "LV" },

  // ── Lithuania ────────────────────────────────────────────────
  { city: "Vilnius",              country: "Lithuania",           country_code: "LT" },
  { city: "Kaunas",               country: "Lithuania",           country_code: "LT" },

  // ── Poland ───────────────────────────────────────────────────
  { city: "Warsaw",               country: "Poland",              country_code: "PL" },
  { city: "Kraków",               country: "Poland",              country_code: "PL" },
  { city: "Gdańsk",               country: "Poland",              country_code: "PL" },
  { city: "Wrocław",              country: "Poland",              country_code: "PL" },
  { city: "Poznań",               country: "Poland",              country_code: "PL" },

  // ── Czech Republic ───────────────────────────────────────────
  { city: "Prague",               country: "Czech Republic",      country_code: "CZ" },
  { city: "Brno",                 country: "Czech Republic",      country_code: "CZ" },
  { city: "Český Krumlov",        country: "Czech Republic",      country_code: "CZ" },
  { city: "Karlovy Vary",         country: "Czech Republic",      country_code: "CZ" },

  // ── Slovakia ─────────────────────────────────────────────────
  { city: "Bratislava",           country: "Slovakia",            country_code: "SK" },

  // ── Hungary ──────────────────────────────────────────────────
  { city: "Budapest",             country: "Hungary",             country_code: "HU" },
  { city: "Eger",                 country: "Hungary",             country_code: "HU" },

  // ── Romania ──────────────────────────────────────────────────
  { city: "Bucharest",            country: "Romania",             country_code: "RO" },
  { city: "Cluj-Napoca",          country: "Romania",             country_code: "RO" },
  { city: "Brașov",               country: "Romania",             country_code: "RO" },
  { city: "Sibiu",                country: "Romania",             country_code: "RO" },

  // ── Bulgaria ─────────────────────────────────────────────────
  { city: "Sofia",                country: "Bulgaria",            country_code: "BG" },
  { city: "Plovdiv",              country: "Bulgaria",            country_code: "BG" },
  { city: "Varna",                country: "Bulgaria",            country_code: "BG" },

  // ── Greece ───────────────────────────────────────────────────
  { city: "Athens",               country: "Greece",              country_code: "GR" },
  { city: "Thessaloniki",         country: "Greece",              country_code: "GR" },
  { city: "Santorini",            country: "Greece",              country_code: "GR" },
  { city: "Mykonos",              country: "Greece",              country_code: "GR" },
  { city: "Crete",                country: "Greece",              country_code: "GR" },
  { city: "Rhodes",               country: "Greece",              country_code: "GR" },
  { city: "Corfu",                country: "Greece",              country_code: "GR" },
  { city: "Meteora",              country: "Greece",              country_code: "GR" },
  { city: "Delphi",               country: "Greece",              country_code: "GR" },

  // ── Cyprus ───────────────────────────────────────────────────
  { city: "Nicosia",              country: "Cyprus",              country_code: "CY" },
  { city: "Limassol",             country: "Cyprus",              country_code: "CY" },
  { city: "Paphos",               country: "Cyprus",              country_code: "CY" },

  // ── Malta ────────────────────────────────────────────────────
  { city: "Valletta",             country: "Malta",               country_code: "MT" },
  { city: "Gozo",                 country: "Malta",               country_code: "MT" },

  // ── Slovenia ─────────────────────────────────────────────────
  { city: "Ljubljana",            country: "Slovenia",            country_code: "SI" },
  { city: "Lake Bled",            country: "Slovenia",            country_code: "SI" },

  // ── Croatia ──────────────────────────────────────────────────
  { city: "Zagreb",               country: "Croatia",             country_code: "HR" },
  { city: "Dubrovnik",            country: "Croatia",             country_code: "HR" },
  { city: "Split",                country: "Croatia",             country_code: "HR" },
  { city: "Pula",                 country: "Croatia",             country_code: "HR" },
  { city: "Zadar",                country: "Croatia",             country_code: "HR" },
  { city: "Hvar",                 country: "Croatia",             country_code: "HR" },

  // ── Bosnia and Herzegovina ───────────────────────────────────
  { city: "Sarajevo",             country: "Bosnia and Herzegovina", country_code: "BA" },
  { city: "Mostar",               country: "Bosnia and Herzegovina", country_code: "BA" },

  // ── Serbia ───────────────────────────────────────────────────
  { city: "Belgrade",             country: "Serbia",              country_code: "RS" },
  { city: "Novi Sad",             country: "Serbia",              country_code: "RS" },

  // ── Montenegro ───────────────────────────────────────────────
  { city: "Podgorica",            country: "Montenegro",          country_code: "ME" },
  { city: "Kotor",                country: "Montenegro",          country_code: "ME" },
  { city: "Budva",                country: "Montenegro",          country_code: "ME" },

  // ── North Macedonia ──────────────────────────────────────────
  { city: "Skopje",               country: "North Macedonia",     country_code: "MK" },
  { city: "Ohrid",                country: "North Macedonia",     country_code: "MK" },

  // ── Albania ──────────────────────────────────────────────────
  { city: "Tirana",               country: "Albania",             country_code: "AL" },
  { city: "Berat",                country: "Albania",             country_code: "AL" },
  { city: "Gjirokastër",          country: "Albania",             country_code: "AL" },

  // ── Ukraine ──────────────────────────────────────────────────
  { city: "Kyiv",                 country: "Ukraine",             country_code: "UA" },
  { city: "Lviv",                 country: "Ukraine",             country_code: "UA" },

  // ── Russia ───────────────────────────────────────────────────
  { city: "Moscow",               country: "Russia",              country_code: "RU" },
  { city: "St. Petersburg",       country: "Russia",              country_code: "RU" },
  { city: "Kazan",                country: "Russia",              country_code: "RU" },
  { city: "Sochi",                country: "Russia",              country_code: "RU" },

  // ── Georgia ──────────────────────────────────────────────────
  { city: "Tbilisi",              country: "Georgia",             country_code: "GE" },
  { city: "Batumi",               country: "Georgia",             country_code: "GE" },
  { city: "Kazbegi",              country: "Georgia",             country_code: "GE" },

  // ── Armenia ──────────────────────────────────────────────────
  { city: "Yerevan",              country: "Armenia",             country_code: "AM" },

  // ── Azerbaijan ───────────────────────────────────────────────
  { city: "Baku",                 country: "Azerbaijan",          country_code: "AZ" },

  // ── Kazakhstan ───────────────────────────────────────────────
  { city: "Almaty",               country: "Kazakhstan",          country_code: "KZ" },
  { city: "Astana",               country: "Kazakhstan",          country_code: "KZ" },

  // ── Uzbekistan ───────────────────────────────────────────────
  { city: "Tashkent",             country: "Uzbekistan",          country_code: "UZ" },
  { city: "Samarkand",            country: "Uzbekistan",          country_code: "UZ" },
  { city: "Bukhara",              country: "Uzbekistan",          country_code: "UZ" },
  { city: "Khiva",                country: "Uzbekistan",          country_code: "UZ" },

  // ── Iran ─────────────────────────────────────────────────────
  { city: "Tehran",               country: "Iran",                country_code: "IR" },
  { city: "Isfahan",              country: "Iran",                country_code: "IR" },
  { city: "Shiraz",               country: "Iran",                country_code: "IR" },
  { city: "Yazd",                 country: "Iran",                country_code: "IR" },

  // ── USA ──────────────────────────────────────────────────────
  { city: "New York",             country: "United States",       country_code: "US" },
  { city: "Los Angeles",          country: "United States",       country_code: "US" },
  { city: "Chicago",              country: "United States",       country_code: "US" },
  { city: "San Francisco",        country: "United States",       country_code: "US" },
  { city: "Miami",                country: "United States",       country_code: "US" },
  { city: "Las Vegas",            country: "United States",       country_code: "US" },
  { city: "Seattle",              country: "United States",       country_code: "US" },
  { city: "Boston",               country: "United States",       country_code: "US" },
  { city: "Washington DC",        country: "United States",       country_code: "US" },
  { city: "New Orleans",          country: "United States",       country_code: "US" },
  { city: "Nashville",            country: "United States",       country_code: "US" },
  { city: "Atlanta",              country: "United States",       country_code: "US" },
  { city: "Orlando",              country: "United States",       country_code: "US" },
  { city: "Denver",               country: "United States",       country_code: "US" },
  { city: "Portland",             country: "United States",       country_code: "US" },
  { city: "Austin",               country: "United States",       country_code: "US" },
  { city: "Honolulu",             country: "United States",       country_code: "US" },
  { city: "Anchorage",            country: "United States",       country_code: "US" },
  { city: "San Diego",            country: "United States",       country_code: "US" },
  { city: "Philadelphia",         country: "United States",       country_code: "US" },

  // ── Canada ───────────────────────────────────────────────────
  { city: "Toronto",              country: "Canada",              country_code: "CA" },
  { city: "Vancouver",            country: "Canada",              country_code: "CA" },
  { city: "Montreal",             country: "Canada",              country_code: "CA" },
  { city: "Calgary",              country: "Canada",              country_code: "CA" },
  { city: "Ottawa",               country: "Canada",              country_code: "CA" },
  { city: "Quebec City",          country: "Canada",              country_code: "CA" },
  { city: "Banff",                country: "Canada",              country_code: "CA" },
  { city: "Whistler",             country: "Canada",              country_code: "CA" },
  { city: "Victoria",             country: "Canada",              country_code: "CA" },

  // ── Mexico ───────────────────────────────────────────────────
  { city: "Mexico City",          country: "Mexico",              country_code: "MX" },
  { city: "Cancun",               country: "Mexico",              country_code: "MX" },
  { city: "Guadalajara",          country: "Mexico",              country_code: "MX" },
  { city: "Playa del Carmen",     country: "Mexico",              country_code: "MX" },
  { city: "Tulum",                country: "Mexico",              country_code: "MX" },
  { city: "Oaxaca",               country: "Mexico",              country_code: "MX" },
  { city: "San Miguel de Allende",country: "Mexico",              country_code: "MX" },
  { city: "Puerto Vallarta",      country: "Mexico",              country_code: "MX" },
  { city: "Los Cabos",            country: "Mexico",              country_code: "MX" },
  { city: "Mérida",               country: "Mexico",              country_code: "MX" },

  // ── Guatemala ────────────────────────────────────────────────
  { city: "Guatemala City",       country: "Guatemala",           country_code: "GT" },
  { city: "Antigua",              country: "Guatemala",           country_code: "GT" },

  // ── Costa Rica ───────────────────────────────────────────────
  { city: "San José",             country: "Costa Rica",          country_code: "CR" },
  { city: "Manuel Antonio",       country: "Costa Rica",          country_code: "CR" },
  { city: "Arenal",               country: "Costa Rica",          country_code: "CR" },
  { city: "Monteverde",           country: "Costa Rica",          country_code: "CR" },

  // ── Panama ───────────────────────────────────────────────────
  { city: "Panama City",          country: "Panama",              country_code: "PA" },

  // ── Cuba ─────────────────────────────────────────────────────
  { city: "Havana",               country: "Cuba",                country_code: "CU" },
  { city: "Trinidad",             country: "Cuba",                country_code: "CU" },
  { city: "Varadero",             country: "Cuba",                country_code: "CU" },

  // ── Jamaica ──────────────────────────────────────────────────
  { city: "Kingston",             country: "Jamaica",             country_code: "JM" },
  { city: "Montego Bay",          country: "Jamaica",             country_code: "JM" },

  // ── Dominican Republic ───────────────────────────────────────
  { city: "Santo Domingo",        country: "Dominican Republic",  country_code: "DO" },
  { city: "Punta Cana",           country: "Dominican Republic",  country_code: "DO" },

  // ── Bahamas ──────────────────────────────────────────────────
  { city: "Nassau",               country: "Bahamas",             country_code: "BS" },

  // ── Barbados ─────────────────────────────────────────────────
  { city: "Bridgetown",           country: "Barbados",            country_code: "BB" },

  // ── Colombia ─────────────────────────────────────────────────
  { city: "Bogotá",               country: "Colombia",            country_code: "CO" },
  { city: "Medellín",             country: "Colombia",            country_code: "CO" },
  { city: "Cartagena",            country: "Colombia",            country_code: "CO" },
  { city: "Cali",                 country: "Colombia",            country_code: "CO" },
  { city: "Santa Marta",          country: "Colombia",            country_code: "CO" },

  // ── Ecuador ──────────────────────────────────────────────────
  { city: "Quito",                country: "Ecuador",             country_code: "EC" },
  { city: "Guayaquil",            country: "Ecuador",             country_code: "EC" },
  { city: "Cuenca",               country: "Ecuador",             country_code: "EC" },
  { city: "Galápagos Islands",    country: "Ecuador",             country_code: "EC" },

  // ── Peru ─────────────────────────────────────────────────────
  { city: "Lima",                 country: "Peru",                country_code: "PE" },
  { city: "Cusco",                country: "Peru",                country_code: "PE" },
  { city: "Arequipa",             country: "Peru",                country_code: "PE" },
  { city: "Machu Picchu",         country: "Peru",                country_code: "PE" },
  { city: "Iquitos",              country: "Peru",                country_code: "PE" },

  // ── Bolivia ──────────────────────────────────────────────────
  { city: "La Paz",               country: "Bolivia",             country_code: "BO" },
  { city: "Sucre",                country: "Bolivia",             country_code: "BO" },
  { city: "Uyuni",                country: "Bolivia",             country_code: "BO" },

  // ── Brazil ───────────────────────────────────────────────────
  { city: "Rio de Janeiro",       country: "Brazil",              country_code: "BR" },
  { city: "São Paulo",            country: "Brazil",              country_code: "BR" },
  { city: "Brasília",             country: "Brazil",              country_code: "BR" },
  { city: "Salvador",             country: "Brazil",              country_code: "BR" },
  { city: "Manaus",               country: "Brazil",              country_code: "BR" },
  { city: "Florianópolis",        country: "Brazil",              country_code: "BR" },
  { city: "Foz do Iguaçu",        country: "Brazil",              country_code: "BR" },
  { city: "Fortaleza",            country: "Brazil",              country_code: "BR" },

  // ── Argentina ────────────────────────────────────────────────
  { city: "Buenos Aires",         country: "Argentina",           country_code: "AR" },
  { city: "Córdoba",              country: "Argentina",           country_code: "AR" },
  { city: "Mendoza",              country: "Argentina",           country_code: "AR" },
  { city: "Bariloche",            country: "Argentina",           country_code: "AR" },
  { city: "Ushuaia",              country: "Argentina",           country_code: "AR" },
  { city: "Salta",                country: "Argentina",           country_code: "AR" },
  { city: "El Calafate",          country: "Argentina",           country_code: "AR" },

  // ── Chile ────────────────────────────────────────────────────
  { city: "Santiago",             country: "Chile",               country_code: "CL" },
  { city: "Valparaíso",           country: "Chile",               country_code: "CL" },
  { city: "San Pedro de Atacama", country: "Chile",               country_code: "CL" },
  { city: "Punta Arenas",         country: "Chile",               country_code: "CL" },
  { city: "Easter Island",        country: "Chile",               country_code: "CL" },

  // ── Uruguay ──────────────────────────────────────────────────
  { city: "Montevideo",           country: "Uruguay",             country_code: "UY" },
  { city: "Punta del Este",       country: "Uruguay",             country_code: "UY" },

  // ── Australia ────────────────────────────────────────────────
  { city: "Sydney",               country: "Australia",           country_code: "AU" },
  { city: "Melbourne",            country: "Australia",           country_code: "AU" },
  { city: "Brisbane",             country: "Australia",           country_code: "AU" },
  { city: "Perth",                country: "Australia",           country_code: "AU" },
  { city: "Adelaide",             country: "Australia",           country_code: "AU" },
  { city: "Gold Coast",           country: "Australia",           country_code: "AU" },
  { city: "Cairns",               country: "Australia",           country_code: "AU" },
  { city: "Darwin",               country: "Australia",           country_code: "AU" },
  { city: "Hobart",               country: "Australia",           country_code: "AU" },
  { city: "Uluru",                country: "Australia",           country_code: "AU" },
  { city: "Canberra",             country: "Australia",           country_code: "AU" },
  { city: "Byron Bay",            country: "Australia",           country_code: "AU" },
  { city: "The Great Barrier Reef",country: "Australia",          country_code: "AU" },

  // ── New Zealand ──────────────────────────────────────────────
  { city: "Auckland",             country: "New Zealand",         country_code: "NZ" },
  { city: "Wellington",           country: "New Zealand",         country_code: "NZ" },
  { city: "Queenstown",           country: "New Zealand",         country_code: "NZ" },
  { city: "Christchurch",         country: "New Zealand",         country_code: "NZ" },
  { city: "Rotorua",              country: "New Zealand",         country_code: "NZ" },
  { city: "Dunedin",              country: "New Zealand",         country_code: "NZ" },
  { city: "Nelson",               country: "New Zealand",         country_code: "NZ" },

  // ── Pacific Islands ──────────────────────────────────────────
  { city: "Suva",                 country: "Fiji",                country_code: "FJ" },
  { city: "Nadi",                 country: "Fiji",                country_code: "FJ" },
  { city: "Papeete",              country: "French Polynesia",    country_code: "PF" },
  { city: "Bora Bora",            country: "French Polynesia",    country_code: "PF" },
  { city: "Moorea",               country: "French Polynesia",    country_code: "PF" },
  { city: "Apia",                 country: "Samoa",               country_code: "WS" },
  { city: "Nouméa",               country: "New Caledonia",       country_code: "NC" },
  { city: "Port Vila",            country: "Vanuatu",             country_code: "VU" },
  { city: "Rarotonga",            country: "Cook Islands",        country_code: "CK" },
];

export default CITIES;
