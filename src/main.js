import {
  applyFilters,
  getDishOptions,
  getLatestSnapshot,
  getPlatformOptions,
  getRestaurantOptions,
  getTrendSeries,
  simulatePriceScrape,
} from "./services/dataService.js";
import {
  buildCompetitorRanking,
  buildLocalityInsights,
  buildRecommendation,
  buildSmartAlerts,
  calculateOverviewMetrics,
  enrichRowsWithSuggestions,
  getActionStepSize,
} from "./engines/recommendationEngine.js";
import {
  formatTime,
  renderCompetitorRanking,
  renderKpiCards,
  renderLocalityInsights,
  renderPriceTable,
  renderRecommendation,
  renderSmartAlerts,
  renderTrendChart,
  setDatalistOptions,
  setSelectOptions,
} from "./components/dashboardComponents.js";

const RESTAURANT_IMAGE_MAP = {
  Paradise: "/images/paradise.jpg",
  Mehfil: "/images/mehfil.jpeg",
  "Shah Ghouse": "/images/shahghouse.jpg",
  "Barbeque Nation": "/images/barbequenation.jpeg",
  "Hotel Shadab": "/images/shadab.jpg",
  Bawarchi: "/images/bawarchi.jpg",
  "Pista House": "/images/pistahouse.jpeg",
  Kritunga: "/images/kritunga.jpeg",
  "Platform 65": "/images/platform65.jpeg",
};

const RESTAURANT_THUMB_IMAGES_MAP = {
  Paradise: [
    "/images/paradise1.jpg",
    "/images/paradise2.jpg",
    "/images/paradise3.webp",
  ],
  Mehfil: ["/images/mehfil1.jpeg", "/images/mehfil2.avif", "/images/mehfil3.jpeg"],
  "Shah Ghouse": [
    "/images/shahghouose1.jpeg",
    "/images/shahghouse2.jpeg",
    "/images/shahghouse3.jpeg",
  ],
  "Barbeque Nation": [
    "/images/barbequenation1.jpeg",
    "/images/barbequenation2.jpeg",
    "/images/barbequenation3.jpeg",
  ],
  "Hotel Shadab": ["/images/shadab1.jpeg", "/images/shadab2.jpeg", "/images/shadab3.jpeg"],
  Bawarchi: ["/images/bawarchi1.jpeg", "/images/bawarchi2.jpeg", "/images/bawarchi3.jpeg"],
  "Pista House": [
    "/images/pistahouse1.jpeg",
    "/images/pistahouse2.jpeg",
    "/images/pistahouse3.jpeg",
  ],
  Kritunga: ["/images/kritunga1.jpeg", "/images/kritunga2.jpeg", "/images/kritunga3.jpeg"],
  "Platform 65": [
    "/images/platform65_1.jpeg",
    "/images/platform65_2.jpeg",
    "/images/platform65_3.jpeg",
  ],
};

const RESTAURANT_LOCALITY_MAP = {
  Paradise: "Old City",
  Mehfil: "Chandanagar",
  "Shah Ghouse": "Miyapur",
  "Barbeque Nation": "Madhapur",
  "Hotel Shadab": "Old City",
  Bawarchi: "RTC X Roads",
  "Pista House": "Bachupally",
  Kritunga: "Kukatpally",
  "Platform 65": "KPHB",
};

const state = {
  rows: [],
  availableDishes: [],
  filters: {
    dish: "",
    platform: "All",
    restaurant: "All",
  },
  smartAlerts: [],
  sortDirection: "asc",
};

const dom = {
  scrapeStatus: document.getElementById("scrapeStatus"),
  refreshMock: document.getElementById("refreshMock"),
  dishSearch: document.getElementById("dishSearch"),
  dishOptions: document.getElementById("dishOptions"),
  platformFilter: document.getElementById("platformFilter"),
  restaurantFilter: document.getElementById("restaurantFilter"),
  kpiGrid: document.getElementById("kpiGrid"),
  rowCount: document.getElementById("rowCount"),
  sortPrice: document.getElementById("sortPrice"),
  priceTableBody: document.getElementById("priceTableBody"),
  recommendedPrice: document.getElementById("recommendedPrice"),
  percentDiff: document.getElementById("percentDiff"),
  recommendationReason: document.getElementById("recommendationReason"),
  localityInsights: document.getElementById("localityInsights"),
  trendChart: document.getElementById("trendChart"),
  smartAlerts: document.getElementById("smartAlerts"),
  competitorRanking: document.getElementById("competitorRanking"),
  restaurantSpotlightTitle: document.getElementById("restaurantSpotlightTitle"),
  restaurantImage: document.getElementById("restaurantImage"),
  foodThumbs: document.getElementById("foodThumbs"),
};

bootstrap();

async function bootstrap() {
  bindEvents();
  await refreshMockData();
}

function bindEvents() {
  dom.dishSearch.addEventListener("change", (event) => {
    applyDishSelection(event.target.value);
  });

  dom.dishSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyDishSelection(dom.dishSearch.value);
  });

  dom.dishSearch.addEventListener("blur", () => {
    applyDishSelection(dom.dishSearch.value);
  });

  dom.platformFilter.addEventListener("change", (event) => {
    state.filters.platform = event.target.value;
    renderDashboard();
  });

  dom.restaurantFilter.addEventListener("change", (event) => {
    state.filters.restaurant = event.target.value;
    renderDashboard();
  });

  dom.sortPrice.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    renderDashboard();
  });

  dom.refreshMock.addEventListener("click", async () => {
    await refreshMockData();
  });

  dom.priceTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".action-btn");
    if (!button) return;

    const action = button.dataset.action;
    if (!action) return;
    applyScopedAction(action);
  });
}

async function refreshMockData() {
  dom.refreshMock.disabled = true;
  dom.scrapeStatus.textContent = "Monitoring mock feeds...";

  try {
    const previousLatest = getLatestSnapshot(state.rows);
    const rows = await simulatePriceScrape();
    state.rows = rows;

    hydrateFilters(rows);

    const latest = getLatestSnapshot(rows);
    const currentFiltered = applyFilters(latest, state.filters);
    const previousFiltered = applyFilters(previousLatest, state.filters);
    state.smartAlerts = buildSmartAlerts(currentFiltered, previousFiltered);

    renderDashboard();

    dom.scrapeStatus.textContent = `Last simulated scrape: ${formatTime(new Date())} | ${rows.length} records`;
  } catch (error) {
    console.error(error);
    dom.scrapeStatus.textContent = "Mock scrape failed. Retry.";
    renderEmptyState();
  } finally {
    dom.refreshMock.disabled = false;
  }
}

function hydrateFilters(rows) {
  state.availableDishes = getDishOptions(rows);
  setDatalistOptions(dom.dishOptions, state.availableDishes);
  if (!state.availableDishes.includes(state.filters.dish)) {
    state.filters.dish = state.availableDishes[0] || "";
  }
  dom.dishSearch.value = state.filters.dish;

  setSelectOptions(dom.platformFilter, getPlatformOptions(rows), state.filters.platform);
  setSelectOptions(dom.restaurantFilter, getRestaurantOptions(rows), state.filters.restaurant);

  state.filters.platform = dom.platformFilter.value;
  state.filters.restaurant = dom.restaurantFilter.value;
}

function renderDashboard() {
  const latestRows = getLatestSnapshot(state.rows);
  const filteredLatest = applyFilters(latestRows, state.filters);
  const metrics = calculateOverviewMetrics(filteredLatest);

  const sortedRows = sortRowsByCompetitorPrice(filteredLatest, state.sortDirection);
  const tableRows = enrichRowsWithSuggestions(sortedRows);
  const recommendation = buildRecommendation(filteredLatest);
  const localityInsights = buildLocalityInsights(filteredLatest);
  const rankings = buildCompetitorRanking(filteredLatest);
  const trendSeries = getTrendSeries(state.rows, state.filters);

  renderKpiCards(dom.kpiGrid, metrics);
  renderPriceTable(dom.priceTableBody, tableRows);
  renderRecommendation(
    {
      recommendedPrice: dom.recommendedPrice,
      percentDiff: dom.percentDiff,
      recommendationReason: dom.recommendationReason,
    },
    recommendation
  );
  renderLocalityInsights(dom.localityInsights, localityInsights);
  renderSmartAlerts(dom.smartAlerts, state.smartAlerts);
  renderCompetitorRanking(dom.competitorRanking, rankings);
  renderTrendChart(dom.trendChart, trendSeries);

  renderRestaurantSpotlight(tableRows);

  dom.rowCount.textContent = `${tableRows.length} rows`;
  dom.sortPrice.textContent = `Competitor Price (${state.sortDirection})`;
}

function renderRestaurantSpotlight(rows) {
  if (rows.length === 0) {
    dom.restaurantSpotlightTitle.textContent = "Paradise Spotlight - Old City";
    setImageWithFallback(
      dom.restaurantImage,
      RESTAURANT_IMAGE_MAP.Paradise || fallbackRestaurantImage(),
      fallbackRestaurantImage()
    );
    dom.restaurantImage.alt = "Paradise";
    renderThumbImages("Paradise");
    return;
  }

  const focusedRestaurant =
    state.filters.restaurant !== "All"
      ? state.filters.restaurant
      : "Paradise";
  const focusedRows = rows.filter((row) => row.restaurantName === focusedRestaurant);
  const focusLocality = focusedRows[0]?.locality || RESTAURANT_LOCALITY_MAP[focusedRestaurant] || "";

  dom.restaurantSpotlightTitle.textContent = focusLocality
    ? `${focusedRestaurant} Spotlight - ${focusLocality}`
    : `${focusedRestaurant} Spotlight`;
  setImageWithFallback(
    dom.restaurantImage,
    RESTAURANT_IMAGE_MAP[focusedRestaurant] || fallbackRestaurantImage(),
    fallbackRestaurantImage()
  );
  dom.restaurantImage.alt = focusedRestaurant;

  renderThumbImages(focusedRestaurant);
}

function renderEmptyState() {
  renderKpiCards(dom.kpiGrid, {
    totalCompetitorsTracked: 0,
    averageCompetitorPrice: 0,
    yourCurrentPrice: 0,
    recommendedAdjustment: 0,
  });
  renderPriceTable(dom.priceTableBody, []);
  renderRecommendation(
    {
      recommendedPrice: dom.recommendedPrice,
      percentDiff: dom.percentDiff,
      recommendationReason: dom.recommendationReason,
    },
    {
      suggestedNewPrice: 0,
      percentDifferenceFromMarket: 0,
      reasoning: "No data available.",
    }
  );
  renderLocalityInsights(dom.localityInsights, []);
  renderSmartAlerts(dom.smartAlerts, []);
  renderCompetitorRanking(dom.competitorRanking, []);
  renderTrendChart(dom.trendChart, []);
  dom.restaurantSpotlightTitle.textContent = "Restaurant Spotlight";
  dom.restaurantImage.src = fallbackRestaurantImage();
  dom.foodThumbs.innerHTML = "";
  dom.rowCount.textContent = "0 rows";
}

function sortRowsByCompetitorPrice(rows, direction) {
  const sorted = [...rows].sort((a, b) => a.competitorPrice - b.competitorPrice);
  if (direction === "desc") sorted.reverse();
  return sorted;
}

function mostFrequentRestaurant(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.restaurantName, (counts.get(row.restaurantName) || 0) + 1);
  }

  let bestName = rows[0].restaurantName;
  let bestCount = 0;
  for (const [name, count] of counts.entries()) {
    if (count > bestCount) {
      bestName = name;
      bestCount = count;
    }
  }
  return bestName;
}

function fallbackRestaurantImage() {
  return "/images/restaurant-placeholder.svg";
}

function fallbackFoodImage(index) {
  return `/images/food-placeholder-${(index % 3) + 1}.svg`;
}

function renderThumbImages(restaurantName) {
  const thumbImages =
    RESTAURANT_THUMB_IMAGES_MAP[restaurantName] || RESTAURANT_THUMB_IMAGES_MAP.Paradise || [];
  dom.foodThumbs.innerHTML = "";
  thumbImages.forEach((imageUrl, index) => {
    const img = document.createElement("img");
    img.alt = `${restaurantName} visual ${index + 1}`;
    setImageWithFallback(img, imageUrl, fallbackFoodImage(index));
    dom.foodThumbs.appendChild(img);
  });
}

function setImageWithFallback(imageElement, source, fallback) {
  imageElement.onerror = null;
  imageElement.src = source;
  imageElement.onerror = () => {
    imageElement.onerror = null;
    imageElement.src = fallback;
  };
}

function applyDishSelection(inputValue) {
  const typed = String(inputValue || "").trim();
  if (typed.length === 0) {
    dom.dishSearch.value = state.filters.dish;
    return;
  }

  const exact = state.availableDishes.find(
    (dish) => dish.toLowerCase() === typed.toLowerCase()
  );
  if (exact) {
    state.filters.dish = exact;
    dom.dishSearch.value = exact;
    renderDashboard();
    return;
  }

  const partial = state.availableDishes.find((dish) =>
    dish.toLowerCase().includes(typed.toLowerCase())
  );
  if (partial) {
    state.filters.dish = partial;
    dom.dishSearch.value = partial;
    renderDashboard();
    return;
  }

  dom.dishSearch.value = state.filters.dish;
}

function applyScopedAction(action) {
  if (!["Increase", "Maintain", "Decrease"].includes(action)) return;

  const latestRows = getLatestSnapshot(state.rows);
  if (latestRows.length === 0) return;

  const scopedLatestRows = applyFilters(latestRows, state.filters);
  if (scopedLatestRows.length === 0) return;

  const latestDate = latestRows[0].date;
  const scopedKeys = new Set(scopedLatestRows.map(toScopedKey));
  const step = getActionStepSize();

  state.rows = state.rows.map((row) => {
    if (row.date !== latestDate) return row;
    if (!scopedKeys.has(toScopedKey(row))) return row;

    if (action === "Maintain") {
      return {
        ...row,
        yourPrice: row.baseYourPrice ?? row.yourPrice,
      };
    }

    const delta = action === "Increase" ? step : -step;
    return {
      ...row,
      yourPrice: Math.max(100, row.yourPrice + delta),
    };
  });

  renderDashboard();
}

function toScopedKey(row) {
  return `${row.dishName}__${row.platform}__${row.restaurantName}`;
}
