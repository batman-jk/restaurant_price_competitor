const SMALL_MARGIN = 8;
const ACTION_THRESHOLD = 8;
const ACTION_STEP = 5;

export function applyManualActions(rows, adjustmentByRowId) {
  return rows.map((row) => {
    const adjustment = adjustmentByRowId[row.id] || 0;
    if (adjustment === 0) return row;

    return {
      ...row,
      yourPrice: Math.max(100, row.yourPrice + adjustment),
    };
  });
}

export function getActionStepSize() {
  return ACTION_STEP;
}

export function enrichRowsWithSuggestions(rows, adjustmentByRowId = {}) {
  return rows.map((row) => {
    const priceDifference = row.yourPrice - row.competitorPrice;
    const percentageDifference =
      row.competitorPrice === 0 ? 0 : (priceDifference / row.competitorPrice) * 100;
    let actionSuggestion = "Maintain";

    if (priceDifference > ACTION_THRESHOLD) actionSuggestion = "Decrease";
    if (priceDifference < -ACTION_THRESHOLD) actionSuggestion = "Increase";

    const manualAdjustment = adjustmentByRowId[row.id] || 0;
    let selectedAction = actionSuggestion;
    if (manualAdjustment > 0) selectedAction = "Increase";
    if (manualAdjustment < 0) selectedAction = "Decrease";
    if (manualAdjustment === 0 && adjustmentByRowId[row.id] !== undefined) {
      selectedAction = "Maintain";
    }

    return {
      ...row,
      priceDifference,
      percentageDifference,
      actionSuggestion,
      selectedAction,
    };
  });
}

export function calculateOverviewMetrics(rows) {
  if (rows.length === 0) {
    return {
      totalCompetitorsTracked: 0,
      averageCompetitorPrice: 0,
      yourCurrentPrice: 0,
      recommendedAdjustment: 0,
    };
  }

  const averageCompetitorPrice = median(rows.map((row) => row.competitorPrice));
  const yourCurrentPrice = median(rows.map((row) => row.yourPrice));
  const suggestedNewPrice = averageCompetitorPrice - SMALL_MARGIN;
  const recommendedAdjustment = suggestedNewPrice - yourCurrentPrice;

  return {
    totalCompetitorsTracked: uniqueCount(rows.map((row) => row.restaurantName)),
    averageCompetitorPrice,
    yourCurrentPrice,
    recommendedAdjustment,
  };
}

export function buildRecommendation(rows) {
  if (rows.length === 0) {
    return {
      suggestedNewPrice: 0,
      percentDifferenceFromMarket: 0,
      reasoning:
        "No records match current filters. Expand dish or platform filters to generate a recommendation.",
    };
  }

  const marketAverage = median(rows.map((row) => row.competitorPrice));
  const yourCurrentAverage = median(rows.map((row) => row.yourPrice));
  const suggestedNewPrice = marketAverage - SMALL_MARGIN;

  const marketGapPercent =
    marketAverage === 0 ? 0 : ((yourCurrentAverage - marketAverage) / marketAverage) * 100;
  const adjustmentMagnitude = Math.round(Math.abs(suggestedNewPrice - yourCurrentAverage));

  let reasoning = "Pricing is aligned with market benchmarks. Maintain current pricing for now.";

  if (marketGapPercent > 3) {
    reasoning = `Your price is ${formatPercent(marketGapPercent)} higher than the market average. Reducing by ${formatCurrency(adjustmentMagnitude)} may improve competitiveness.`;
  } else if (marketGapPercent < -3) {
    reasoning = `Your price is ${formatPercent(Math.abs(marketGapPercent))} lower than the market average. Increasing by ${formatCurrency(adjustmentMagnitude)} can protect margin while staying competitive.`;
  }

  return {
    suggestedNewPrice,
    percentDifferenceFromMarket: marketGapPercent,
    reasoning,
  };
}

export function buildLocalityInsights(rows) {
  if (rows.length === 0) return [];

  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.locality)) {
      grouped.set(row.locality, { prices: [], demandValues: [] });
    }
    const entry = grouped.get(row.locality);
    entry.prices.push(row.competitorPrice);
    entry.demandValues.push(row.demandIndex);
  }

  const overallAverage = median(rows.map((row) => row.competitorPrice));

  return Array.from(grouped.entries())
    .map(([locality, stats]) => {
      const avgPrice = median(stats.prices);
      const demand = Math.round(median(stats.demandValues));

      let tag = "Stable Market";
      if (avgPrice >= overallAverage * 1.08 && demand >= 80) tag = "High-demand premium zone";
      if (avgPrice <= overallAverage * 0.95 && demand >= 75) tag = "Opportunity area";

      return {
        locality,
        averagePrice: avgPrice,
        demandIndex: demand,
        tag,
      };
    })
    .sort((a, b) => b.averagePrice - a.averagePrice);
}

export function buildSmartAlerts(currentRows, previousRows = []) {
  const alerts = [];
  if (currentRows.length === 0) return alerts;

  const medianGap = buildRecommendation(currentRows).percentDifferenceFromMarket;
  alerts.push({
    level: Math.abs(medianGap) >= 8 ? "high" : "medium",
    message:
      medianGap > 0
        ? `Median pricing is ${formatPercent(medianGap)} above market. Consider immediate downward correction.`
        : `Median pricing is ${formatPercent(Math.abs(medianGap))} below market. Margin expansion opportunity detected.`,
  });

  const topGapRow = [...currentRows].sort(
    (a, b) =>
      Math.abs((b.yourPrice - b.competitorPrice) / b.competitorPrice) -
      Math.abs((a.yourPrice - a.competitorPrice) / a.competitorPrice)
  )[0];
  if (topGapRow) {
    const gap = ((topGapRow.yourPrice - topGapRow.competitorPrice) / topGapRow.competitorPrice) * 100;
    alerts.push({
      level: "medium",
      message: `${topGapRow.dishName} on ${topGapRow.platform} shows a ${formatPercent(Math.abs(gap))} pricing gap vs ${topGapRow.restaurantName}.`,
    });
  }

  if (previousRows.length > 0) {
    const currentMedian = median(currentRows.map((row) => row.competitorPrice));
    const previousMedian = median(previousRows.map((row) => row.competitorPrice));
    const delta = currentMedian - previousMedian;
    if (Math.abs(delta) >= 3) {
      alerts.push({
        level: delta > 0 ? "high" : "low",
        message: `Market median moved by ${formatCurrency(Math.abs(delta))} since last rescrape (${delta > 0 ? "up" : "down"}).`,
      });
    }
  }

  const localityInsights = buildLocalityInsights(currentRows);
  const opportunity = localityInsights.find((item) => item.tag === "Opportunity area");
  if (opportunity) {
    alerts.push({
      level: "low",
      message: `${opportunity.locality} flagged as opportunity area with median ${formatCurrency(opportunity.averagePrice)}.`,
    });
  }

  return alerts.slice(0, 4);
}

export function buildCompetitorRanking(rows) {
  if (rows.length === 0) return [];

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.restaurantName)) {
      grouped.set(row.restaurantName, {
        prices: [],
        demandValues: [],
        locality: row.locality,
      });
    }
    const entry = grouped.get(row.restaurantName);
    entry.prices.push(row.competitorPrice);
    entry.demandValues.push(row.demandIndex);
  }

  const marketMedian = median(rows.map((row) => row.competitorPrice));

  return Array.from(grouped.entries())
    .map(([restaurantName, stats]) => {
      const medianPrice = median(stats.prices);
      const demandScore = median(stats.demandValues);
      const competitiveness = (marketMedian / medianPrice) * 70 + (demandScore / 100) * 30;

      return {
        restaurantName,
        locality: stats.locality,
        medianPrice,
        demandScore: Math.round(demandScore),
        competitivenessScore: competitiveness,
      };
    })
    .sort((a, b) => b.competitivenessScore - a.competitivenessScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function uniqueCount(values) {
  return new Set(values).size;
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

function formatPercent(value) {
  return `${Math.abs(value).toFixed(1)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
