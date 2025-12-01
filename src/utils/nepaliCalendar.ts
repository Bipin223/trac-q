// Nepali Calendar Utilities - AD to BS and BS to AD conversion
// Based on Bikram Sambat calendar system

interface BSDate {
  year: number;
  month: number;
  day: number;
}

interface ADDate {
  year: number;
  month: number;
  day: number;
}

// BS year data: days in each month for years 2000-2100 BS
const bsMonthData: { [key: number]: number[] } = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
  2099: [31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30],
  2100: [31, 32, 31, 32, 30, 31, 30, 29, 30, 29, 30, 30],
};

// BS starting date equivalent in AD
const bsAdMap: { [key: string]: string } = {
  '2000-01-01': '1943-04-14',
  '2081-01-01': '2024-04-13',
  '2082-01-01': '2025-04-13',
};

// Month names in Nepali
export const nepaliMonths = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

export const nepaliMonthsEng = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

// Convert AD to BS
export function adToBs(adDate: Date): BSDate {
  const adYear = adDate.getFullYear();
  const adMonth = adDate.getMonth() + 1;
  const adDay = adDate.getDate();

  // Base reference: 2000-01-01 BS = 1943-04-14 AD
  const baseAD = new Date(1943, 3, 14); // April 14, 1943
  let baseBSYear = 2000;
  let baseBSMonth = 1;
  let baseBSDay = 1;

  // Calculate days difference
  const diffTime = adDate.getTime() - baseAD.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let bsYear = baseBSYear;
  let bsMonth = baseBSMonth;
  let bsDay = baseBSDay;

  while (diffDays > 0) {
    const monthDays = bsMonthData[bsYear]?.[bsMonth - 1] || 30;
    const daysInMonth = monthDays - bsDay + 1;

    if (diffDays >= daysInMonth) {
      diffDays -= daysInMonth;
      bsMonth++;
      bsDay = 1;

      if (bsMonth > 12) {
        bsMonth = 1;
        bsYear++;
      }
    } else {
      bsDay += diffDays;
      diffDays = 0;
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

// Convert BS to AD
export function bsToAd(bsDate: BSDate): Date {
  const { year, month, day } = bsDate;

  // Base reference: 2000-01-01 BS = 1943-04-14 AD
  const baseAD = new Date(1943, 3, 14);
  let totalDays = 0;

  // Calculate days from base BS year to target BS date
  for (let y = 2000; y < year; y++) {
    if (bsMonthData[y]) {
      totalDays += bsMonthData[y].reduce((sum, days) => sum + days, 0);
    }
  }

  // Add days for months in target year
  for (let m = 1; m < month; m++) {
    totalDays += bsMonthData[year]?.[m - 1] || 30;
  }

  // Add remaining days
  totalDays += day - 1;

  // Calculate AD date
  const adDate = new Date(baseAD.getTime() + totalDays * 24 * 60 * 60 * 1000);
  return adDate;
}

// Format BS date
export function formatBsDate(bsDate: BSDate, useNepali: boolean = false): string {
  const months = useNepali ? nepaliMonths : nepaliMonthsEng;
  return `${bsDate.year} ${months[bsDate.month - 1]} ${bsDate.day}`;
}

// Get current BS date
export function getCurrentBsDate(): BSDate {
  return adToBs(new Date());
}

// Check if BS date is valid
export function isValidBsDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  
  const monthData = bsMonthData[year];
  if (!monthData) return false;
  
  return day <= monthData[month - 1];
}

// Get days in BS month
export function getDaysInBsMonth(year: number, month: number): number {
  return bsMonthData[year]?.[month - 1] || 30;
}

// Nepali holidays and events
export interface NepaliHoliday {
  month: number;
  day: number;
  name: string;
  nameNepali: string;
  type: 'festival' | 'public' | 'observance';
}

export const nepaliHolidays: NepaliHoliday[] = [
  // Baisakh (Month 1)
  { month: 1, day: 1, name: 'Nepali New Year', nameNepali: 'नयाँ वर्ष', type: 'public' },
  { month: 1, day: 11, name: 'Mahavir Jayanti', nameNepali: 'महावीर जयन्ती', type: 'observance' },
  
  // Jestha (Month 2)
  { month: 2, day: 15, name: 'Buddha Jayanti', nameNepali: 'बुद्ध जयन्ती', type: 'public' },
  
  // Ashadh (Month 3)
  { month: 3, day: 15, name: 'Eid al-Fitr', nameNepali: 'इद उल फित्र', type: 'public' },
  
  // Shrawan (Month 4)
  { month: 4, day: 15, name: 'Janai Purnima', nameNepali: 'जनै पूर्णिमा', type: 'festival' },
  { month: 4, day: 23, name: 'Gai Jatra', nameNepali: 'गाई जात्रा', type: 'festival' },
  
  // Bhadra (Month 5)
  { month: 5, day: 3, name: 'Krishna Janmashtami', nameNepali: 'कृष्ण जन्माष्टमी', type: 'festival' },
  { month: 5, day: 18, name: 'Teej', nameNepali: 'तीज', type: 'festival' },
  { month: 5, day: 20, name: 'Rishi Panchami', nameNepali: 'ऋषि पञ्चमी', type: 'observance' },
  
  // Ashwin (Month 6)
  { month: 6, day: 8, name: 'Indra Jatra', nameNepali: 'इन्द्र जात्रा', type: 'festival' },
  { month: 6, day: 15, name: 'Ghatasthapana', nameNepali: 'घटस्थापना', type: 'festival' },
  { month: 6, day: 24, name: 'Fulpati', nameNepali: 'फूलपाती', type: 'festival' },
  { month: 6, day: 25, name: 'Maha Ashtami', nameNepali: 'महा अष्टमी', type: 'festival' },
  { month: 6, day: 26, name: 'Maha Nawami', nameNepali: 'महा नवमी', type: 'festival' },
  { month: 6, day: 27, name: 'Vijaya Dashami', nameNepali: 'विजया दशमी', type: 'public' },
  
  // Kartik (Month 7)
  { month: 7, day: 11, name: 'Tihar (Kaag Tihar)', nameNepali: 'तिहार (काग तिहार)', type: 'festival' },
  { month: 7, day: 12, name: 'Kukur Tihar', nameNepali: 'कुकुर तिहार', type: 'festival' },
  { month: 7, day: 13, name: 'Laxmi Puja', nameNepali: 'लक्ष्मी पूजा', type: 'public' },
  { month: 7, day: 14, name: 'Govardhan Puja', nameNepali: 'गोवर्धन पूजा', type: 'festival' },
  { month: 7, day: 15, name: 'Bhai Tika', nameNepali: 'भाई टीका', type: 'public' },
  { month: 7, day: 23, name: 'Chhath', nameNepali: 'छठ', type: 'public' },
  
  // Mangsir (Month 8)
  { month: 8, day: 1, name: 'Udhauli', nameNepali: 'उधौली', type: 'observance' },
  
  // Poush (Month 9)
  { month: 9, day: 1, name: 'Tamu Lhosar', nameNepali: 'तामु ल्होसार', type: 'festival' },
  { month: 9, day: 15, name: 'Maghe Sankranti', nameNepali: 'माघे संक्रान्ति', type: 'public' },
  
  // Magh (Month 10)
  { month: 10, day: 7, name: 'Basanta Panchami', nameNepali: 'बसन्त पञ्चमी', type: 'observance' },
  { month: 10, day: 15, name: 'Sonam Lhosar', nameNepali: 'सोनम ल्होसार', type: 'festival' },
  { month: 10, day: 26, name: 'Prajatantra Diwas', nameNepali: 'प्रजातन्त्र दिवस', type: 'public' },
  
  // Falgun (Month 11)
  { month: 11, day: 14, name: 'Maha Shivaratri', nameNepali: 'महा शिवरात्रि', type: 'public' },
  { month: 11, day: 29, name: 'Holi', nameNepali: 'होली', type: 'public' },
  
  // Chaitra (Month 12)
  { month: 12, day: 1, name: 'Ghode Jatra', nameNepali: 'घोडे जात्रा', type: 'festival' },
  { month: 12, day: 8, name: 'Ram Nawami', nameNepali: 'राम नवमी', type: 'observance' },
];

// Get holidays for a specific BS month and year
export function getHolidaysForMonth(year: number, month: number): NepaliHoliday[] {
  return nepaliHolidays.filter(h => h.month === month);
}

// Check if a BS date is a holiday
export function isHoliday(year: number, month: number, day: number): NepaliHoliday | undefined {
  return nepaliHolidays.find(h => h.month === month && h.day === day);
}

// Get day of week for BS date (0 = Sunday, 6 = Saturday)
export function getBsDayOfWeek(bsDate: BSDate): number {
  const adDate = bsToAd(bsDate);
  return adDate.getDay();
}

// Nepali day names
export const nepaliDays = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
export const nepaliDaysEng = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
