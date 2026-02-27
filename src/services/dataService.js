const PLATFORMS = ["Swiggy", "Zomato", "Uber Eats"];

const DISH_CATALOG = [
  { name: "Chicken Biryani", basePrice: 285, yourBasePrice: 305 },
  { name: "Paneer Tikka", basePrice: 240, yourBasePrice: 255 },
  { name: "Grilled Chicken", basePrice: 320, yourBasePrice: 335 },
  { name: "Roti / Naan", basePrice: 40, yourBasePrice: 45 },
  { name: "Mutton Biryani", basePrice: 355, yourBasePrice: 375 },
  { name: "Haleem", basePrice: 220, yourBasePrice: 235 },
  { name: "Chole Bhature", basePrice: 170, yourBasePrice: 185 },
  { name: "Kheer", basePrice: 120, yourBasePrice: 135 },
  { name: "Ice Cream", basePrice: 110, yourBasePrice: 125 },
];

const COMPETITORS = [
  {
    restaurantName: "Mehfil",
    locality: "Chandanagar",
    localityPremium: 8,
    restaurantBias: 6,
    demandIndex: 82,
  },
  {
    restaurantName: "Shah Ghouse",
    locality: "Miyapur",
    localityPremium: 10,
    restaurantBias: 8,
    demandIndex: 86,
  },
  {
    restaurantName: "Barbeque Nation",
    locality: "Madhapur",
    localityPremium: 18,
    restaurantBias: 10,
    demandIndex: 90,
  },
  {
    restaurantName: "Hotel Shadab",
    locality: "Old City",
    localityPremium: 12,
    restaurantBias: 7,
    demandIndex: 89,
  },
  {
    restaurantName: "Bawarchi",
    locality: "RTC X Roads",
    localityPremium: 9,
    restaurantBias: 5,
    demandIndex: 85,
  },
  {
    restaurantName: "Pista House",
    locality: "Bachupally",
    localityPremium: 7,
    restaurantBias: 4,
    demandIndex: 78,
  },
  {
    restaurantName: "Kritunga",
    locality: "Kukatpally",
    localityPremium: 11,
    restaurantBias: 6,
    demandIndex: 83,
  },
  {
    restaurantName: "Platform 65",
    locality: "KPHB",
    localityPremium: 13,
    restaurantBias: 9,
    demandIndex: 87,
  },
];

const PLATFORM_BIAS = {
  Swiggy: 4,
  Zomato: 8,
  "Uber Eats": 2,
};

let scrapeIteration = 0;

export async function simulatePriceScrape() {
  scrapeIteration += 1;
  await sleep(260);
  return generateMockDataset(scrapeIteration);
}

export function getDishOptions(rows) {
  return uniqueSorted(rows.map((row) => row.dishName));
}

export function getPlatformOptions(rows) {
  return uniqueSorted(rows.map((row) => row.platform));
}

export function getRestaurantOptions(rows) {
  return uniqueSorted(rows.map((row) => row.restaurantName));
}

export function getLatestSnapshot(rows) {
  if (rows.length === 0) return [];
  const latestDate = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), rows[0].date);
  return rows.filter((row) => row.date === latestDate);
}

export function applyFilters(rows, filters) {
  return rows.filter((row) => {
    const dishMatch = filters.dish === "All" || row.dishName === filters.dish;
    const platformMatch = filters.platform === "All" || row.platform === filters.platform;
    const restaurantMatch =
      filters.restaurant === "All" || row.restaurantName === filters.restaurant;
    return dishMatch && platformMatch && restaurantMatch;
  });
}

export function getTrendSeries(rows, filters) {
  const scopedRows = applyFilters(rows, filters);
  const grouped = new Map();

  for (const row of scopedRows) {
    if (!grouped.has(row.date)) {
      grouped.set(row.date, { competitorPrices: [], yourPrices: [] });
    }
    const entry = grouped.get(row.date);
    entry.competitorPrices.push(row.competitorPrice);
    entry.yourPrices.push(row.yourPrice);
  }

  return Array.from(grouped.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, stats]) => ({
      date,
      dateLabel: date.slice(5),
      competitorAverage: median(stats.competitorPrices),
      yourAverage: median(stats.yourPrices),
    }));
}

function generateMockDataset(iteration) {
  const rows = [];
  const daySpan = 14;
  const now = new Date();

  for (let offset = daySpan - 1; offset >= 0; offset -= 1) {
    const point = new Date(now);
    point.setDate(now.getDate() - offset);
    const date = toIsoDate(point);
    const dayIndex = daySpan - 1 - offset;

    for (const competitor of COMPETITORS) {
      for (const platform of PLATFORMS) {
        for (const dish of DISH_CATALOG) {
          const dayWave = (((dayIndex + competitor.restaurantName.length + iteration) % 5) - 2) * 2;
          const dishWave = ((dish.name.length + dayIndex + iteration) % 4) - 1;
          const recentScrapeEffect = offset < 3 ? (iteration % 3) - 1 : 0;

          const competitorPrice = Math.max(
            140,
            Math.round(
              dish.basePrice +
                competitor.localityPremium +
                competitor.restaurantBias +
                PLATFORM_BIAS[platform] +
                dayWave +
                dishWave +
                recentScrapeEffect
            )
          );

          const yourPrice = Math.max(
            140,
            Math.round(
              dish.yourBasePrice +
                Math.round(competitor.localityPremium * 0.25) +
                ((dayIndex + iteration) % 3 === 0 ? 2 : 0)
            )
          );

          rows.push({
            id: `${date}-${platform}-${competitor.restaurantName}-${dish.name}`,
            date,
            platform,
            restaurantName: competitor.restaurantName,
            dishName: dish.name,
            locality: competitor.locality,
            competitorPrice,
            yourPrice,
            baseYourPrice: yourPrice,
            demandIndex: competitor.demandIndex,
          });
        }
      }
    }
  }

  return rows;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function toIsoDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
