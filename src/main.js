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
  applyManualActions,
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
  Paradise:
    "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
  "Spice Route Kitchen":
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  "Metro Tandoor House":
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  "Nizam Bowl House":
    "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=1200&q=80",
  "Urban Curry Lab":
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
  "Charcoal Plate":
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
  "Saffron Deck":
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
};

const FOOD_IMAGES_BY_DISH = {
  "Chicken Biryani": [
    "https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1596797038530-2c107aa56a41?auto=format&fit=crop&w=700&q=80",
  ],
  "Paneer Biryani": [
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80",
  ],
  "Butter Chicken": [
    "https://images.unsplash.com/photo-1604908176997-4311b1c9f22c?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1596797038530-2c107aa56a41?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=700&q=80",
  ],
  "Veg Hakka Noodles": [
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1516901121982-4ba280115a36?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=700&q=80",
  ],
  "Margherita Pizza": [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80",
  ],
};

const state = {
  rows: [],
  availableDishes: [],
  filters: {
    dish: "",
    platform: "All",
    restaurant: "All",
  },
  manualAdjustments: {},
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

    const rowId = button.dataset.rowId;
    const action = button.dataset.action;
    if (!rowId || !action) return;

    const currentAdjustment = state.manualAdjustments[rowId] || 0;
    const step = getActionStepSize();

    if (action === "Increase") state.manualAdjustments[rowId] = currentAdjustment + step;
    if (action === "Decrease") state.manualAdjustments[rowId] = currentAdjustment - step;
    if (action === "Maintain") state.manualAdjustments[rowId] = 0;

    renderDashboard();
  });
}

async function refreshMockData() {
  dom.refreshMock.disabled = true;
  dom.scrapeStatus.textContent = "Monitoring mock feeds...";

  try {
    const previousLatest = getLatestSnapshot(state.rows);
    const rows = await simulatePriceScrape();
    state.rows = rows;
    state.manualAdjustments = {};

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
  const adjustedLatest = applyManualActions(filteredLatest, state.manualAdjustments);
  const sortedRows = sortRowsByCompetitorPrice(adjustedLatest, state.sortDirection);
  const tableRows = enrichRowsWithSuggestions(sortedRows, state.manualAdjustments);

  const metrics = calculateOverviewMetrics(adjustedLatest);
  const recommendation = buildRecommendation(adjustedLatest);
  const localityInsights = buildLocalityInsights(adjustedLatest);
  const rankings = buildCompetitorRanking(adjustedLatest);
  const trendRows = applyManualActions(state.rows, state.manualAdjustments);
  const trendSeries = getTrendSeries(trendRows, state.filters);

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
    dom.restaurantSpotlightTitle.textContent = "Restaurant Spotlight";
    dom.restaurantImage.src = fallbackRestaurantImage();
    dom.foodThumbs.innerHTML = "";
    return;
  }

  const focusedRestaurant =
    state.filters.restaurant !== "All"
      ? state.filters.restaurant
      : mostFrequentRestaurant(rows);
  const focusedRows = rows.filter((row) => row.restaurantName === focusedRestaurant);
  const focusDish = state.filters.dish || focusedRows[0]?.dishName || rows[0].dishName;
  const focusLocality = focusedRows[0]?.locality ?? "";

  dom.restaurantSpotlightTitle.textContent = focusLocality
    ? `Paradise Signature - ${focusLocality}`
    : "Paradise Signature";
  dom.restaurantImage.src = RESTAURANT_IMAGE_MAP.Paradise || fallbackRestaurantImage();
  dom.restaurantImage.alt = "Paradise";

  const foodImages = FOOD_IMAGES_BY_DISH[focusDish] || FOOD_IMAGES_BY_DISH["Chicken Biryani"];
  dom.foodThumbs.innerHTML = foodImages
    .map(
      (imageUrl, index) => `
        <img src="${imageUrl}" alt="${focusDish} visual ${index + 1}" />
      `
    )
    .join("");
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
  return "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80";
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
