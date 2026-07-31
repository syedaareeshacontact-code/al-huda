export interface PrayerLocationOption {
  country: string;
  aliases?: string[];
  cities: string[];
}

export const PRAYER_LOCATION_OPTIONS: PrayerLocationOption[] = [
  {
    country: 'Pakistan',
    aliases: ['PK'],
    cities: [
      'Karachi',
      'Lahore',
      'Islamabad',
      'Rawalpindi',
      'Peshawar',
      'Quetta',
      'Multan',
      'Faisalabad',
      'Hyderabad',
      'Sialkot',
      'Gujranwala',
      'Sukkur',
    ],
  },
  {
    country: 'India',
    aliases: ['IN', 'Bharat'],
    cities: [
      'Mumbai',
      'Delhi',
      'Bengaluru',
      'Hyderabad',
      'Chennai',
      'Kolkata',
      'Ahmedabad',
      'Pune',
      'Jaipur',
      'Lucknow',
      'Surat',
      'Bhopal',
    ],
  },
  {
    country: 'United States',
    aliases: ['US', 'USA', 'America', 'United States of America'],
    cities: [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Philadelphia',
      'San Antonio',
      'San Diego',
      'Dallas',
      'San Jose',
      'Seattle',
      'Washington',
    ],
  },
  {
    country: 'United Kingdom',
    aliases: ['UK', 'Britain', 'England'],
    cities: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol'],
  },
  {
    country: 'Canada',
    aliases: ['CA'],
    cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'],
  },
  {
    country: 'United Arab Emirates',
    aliases: ['UAE', 'Emirates'],
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain', 'Ras Al Khaimah'],
  },
  {
    country: 'Saudi Arabia',
    aliases: ['KSA'],
    cities: ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dammam', 'Taif', 'Khobar'],
  },
  {
    country: 'Turkey',
    aliases: ['Turkiye'],
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Konya', 'Antalya'],
  },
  {
    country: 'Indonesia',
    aliases: ['ID'],
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Makassar', 'Yogyakarta'],
  },
  {
    country: 'Malaysia',
    aliases: ['MY'],
    cities: ['Kuala Lumpur', 'Johor Bahru', 'George Town', 'Ipoh', 'Shah Alam'],
  },
  {
    country: 'Bangladesh',
    aliases: ['BD'],
    cities: ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi'],
  },
  {
    country: 'Afghanistan',
    aliases: ['AF'],
    cities: ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad'],
  },
  {
    country: 'Iran',
    aliases: ['IR'],
    cities: ['Tehran', 'Mashhad', 'Isfahan', 'Shiraz', 'Tabriz'],
  },
  {
    country: 'Iraq',
    aliases: ['IQ'],
    cities: ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Karbala'],
  },
  {
    country: 'Qatar',
    aliases: ['QA'],
    cities: ['Doha', 'Al Wakrah', 'Al Rayyan', 'Umm Salal'],
  },
  {
    country: 'Kuwait',
    aliases: ['KW'],
    cities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya'],
  },
  {
    country: 'Oman',
    aliases: ['OM'],
    cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa'],
  },
  {
    country: 'Bahrain',
    aliases: ['BH'],
    cities: ['Manama', 'Riffa', 'Muharraq', 'Isa Town'],
  },
  {
    country: 'Egypt',
    aliases: ['EG'],
    cities: ['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Luxor'],
  },
  {
    country: 'Morocco',
    aliases: ['MA'],
    cities: ['Casablanca', 'Rabat', 'Marrakesh', 'Fez', 'Tangier'],
  },
  {
    country: 'Nigeria',
    aliases: ['NG'],
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'],
  },
  {
    country: 'South Africa',
    aliases: ['ZA'],
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'],
  },
  {
    country: 'Kenya',
    aliases: ['KE'],
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  },
  {
    country: 'Australia',
    aliases: ['AU'],
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
  },
  {
    country: 'Germany',
    aliases: ['DE'],
    cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart'],
  },
  {
    country: 'France',
    aliases: ['FR'],
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes'],
  },
  {
    country: 'Italy',
    aliases: ['IT'],
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Florence'],
  },
  {
    country: 'Spain',
    aliases: ['ES'],
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga'],
  },
  {
    country: 'Netherlands',
    aliases: ['NL', 'Holland'],
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  },
];

export function normalizeLocationSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function searchTextMatches(value: string, query: string) {
  const normalizedQuery = normalizeLocationSearch(query);
  return !normalizedQuery || normalizeLocationSearch(value).includes(normalizedQuery);
}

export function sameLocationValue(left: string, right: string) {
  return normalizeLocationSearch(left) === normalizeLocationSearch(right);
}

export function getCountryOption(country: string) {
  return PRAYER_LOCATION_OPTIONS.find((option) => {
    if (sameLocationValue(option.country, country)) {
      return true;
    }

    return option.aliases?.some((alias) => sameLocationValue(alias, country)) ?? false;
  });
}

export function getCitiesForCountry(country: string) {
  return getCountryOption(country)?.cities ?? [];
}
