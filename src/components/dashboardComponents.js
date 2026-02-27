export function renderKpiCards(container, metrics) {
  const cards = [
    {
      label: "Total Competitors Tracked",
      value: formatCount(metrics.totalCompetitorsTracked),
      tone: "neutral",
    },
    {
      label: "Average Competitor Price",
      value: formatCurrency(metrics.averageCompetitorPrice),
      tone: "neutral",
    },
    {
      label: "Your Current Price",
      value: formatCurrency(metrics.yourCurrentPrice),
      tone: "neutral",
    },
    {
      label: "Recommended Price Adjustment (+&#8377; / -&#8377;)",
      value: formatSignedCurrency(metrics.recommendedAdjustment),
      tone:
        metrics.recommendedAdjustment > 0
          ? "up"
          : metrics.recommendedAdjustment < 0
            ? "down"
            : "neutral",
    },
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi-card ${card.tone}">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

export function renderPriceTable(body, rows) {
  if (rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7">No rows match the selected filters.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows
    .map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.platform)}</td>
          <td><strong class="restaurant-cell">${escapeHtml(row.restaurantName)}</strong></td>
          <td>${escapeHtml(row.dishName)}</td>
          <td>${formatCurrency(row.competitorPrice)}</td>
          <td>${formatCurrency(row.yourPrice)}</td>
          <td>${formatSignedPercent(row.percentageDifference)}</td>
          <td>
            <div class="action-controls">
              ${renderActionButton(row.id, "Increase", row.selectedAction)}
              ${renderActionButton(row.id, "Maintain", row.selectedAction)}
              ${renderActionButton(row.id, "Decrease", row.selectedAction)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

export function renderRecommendation(target, recommendation) {
  target.recommendedPrice.textContent = formatCurrency(recommendation.suggestedNewPrice);
  target.percentDiff.textContent = `${recommendation.percentDifferenceFromMarket.toFixed(1)}%`;
  target.recommendationReason.textContent = recommendation.reasoning;
}

export function renderLocalityInsights(container, insights) {
  if (insights.length === 0) {
    container.innerHTML = `<p class="empty-note">No locality data available for current filters.</p>`;
    return;
  }

  container.innerHTML = insights
    .map(
      (entry) => `
        <article class="locality-item">
          <div>
            <strong>${escapeHtml(entry.locality)}</strong>
            <p>Demand Index: ${entry.demandIndex}</p>
          </div>
          <div class="locality-meta">
            <span class="tag">${escapeHtml(entry.tag)}</span>
            <strong>${formatCurrency(entry.averagePrice)}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderTrendChart(svg, series) {
  if (series.length === 0) {
    svg.innerHTML = `<text x="28" y="48" class="empty-note">No trend data for selected filters.</text>`;
    return;
  }

  const width = 860;
  const height = 280;
  const padding = { top: 18, right: 24, bottom: 38, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = series.flatMap((point) => [point.competitorAverage, point.yourAverage]);
  let minValue = Math.min(...allValues);
  let maxValue = Math.max(...allValues);

  if (minValue === maxValue) {
    minValue -= 6;
    maxValue += 6;
  }

  const xForIndex = (index) =>
    padding.left + (series.length === 1 ? chartWidth / 2 : (index * chartWidth) / (series.length - 1));
  const yForValue = (value) =>
    padding.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight;

  const competitorPoints = series.map((point, index) => ({
    x: xForIndex(index),
    y: yForValue(point.competitorAverage),
    label: point.dateLabel,
  }));
  const yourPoints = series.map((point, index) => ({
    x: xForIndex(index),
    y: yForValue(point.yourAverage),
    label: point.dateLabel,
  }));

  const competitorPath = toPath(competitorPoints);
  const yourPath = toPath(yourPoints);

  const yGrid = Array.from({ length: 5 }).map((_, index) => {
    const ratio = index / 4;
    const value = maxValue - ratio * (maxValue - minValue);
    const y = padding.top + ratio * chartHeight;
    return `
      <line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
      <text class="axis-label" x="10" y="${y + 4}">${formatCurrency(value)}</text>
    `;
  });

  const xLabels = competitorPoints
    .filter((_, index) => index % Math.max(1, Math.ceil(series.length / 7)) === 0 || index === series.length - 1)
    .map(
      (point) => `
        <text class="axis-label x-label" x="${point.x}" y="${height - 10}">${escapeHtml(point.label)}</text>
      `
    );

  svg.innerHTML = `
    ${yGrid.join("")}
    <line class="axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
    <line class="axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>

    <path class="line competitor-line" d="${competitorPath}"></path>
    <path class="line your-line" d="${yourPath}"></path>

    ${circleSeries(competitorPoints, "competitor-point")}
    ${circleSeries(yourPoints, "your-point")}
    ${xLabels.join("")}
  `;
}

export function setSelectOptions(select, options, selectedValue) {
  const values = ["All", ...options];
  select.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");

  select.value = values.includes(selectedValue) ? selectedValue : "All";
}

export function setDatalistOptions(datalist, options) {
  datalist.innerHTML = options
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

export function renderSmartAlerts(container, alerts) {
  if (alerts.length === 0) {
    container.innerHTML = `<p class="empty-note">No smart alerts in this cycle.</p>`;
    return;
  }

  container.innerHTML = alerts
    .map(
      (alert) => `
        <article class="alert-item ${escapeHtml(alert.level)}">
          <span class="alert-level">${escapeHtml(alert.level.toUpperCase())}</span>
          <p>${escapeHtml(alert.message)}</p>
        </article>
      `
    )
    .join("");
}

export function renderCompetitorRanking(container, rankings) {
  if (rankings.length === 0) {
    container.innerHTML = `<p class="empty-note">No ranking data for current filters.</p>`;
    return;
  }

  container.innerHTML = rankings
    .slice(0, 6)
    .map(
      (rank) => `
        <article class="rank-item">
          <div class="rank-main">
            <span class="rank-index">#${rank.rank}</span>
            <div>
              <strong>${escapeHtml(rank.restaurantName)}</strong>
              <p>${escapeHtml(rank.locality)} | Demand ${rank.demandScore}</p>
            </div>
          </div>
          <div class="rank-meta">
            <span>${formatCurrency(rank.medianPrice)}</span>
            <small>Score ${rank.competitivenessScore.toFixed(1)}</small>
          </div>
        </article>
      `
    )
    .join("");
}

export function formatTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function toPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}

function circleSeries(points, className) {
  return points
    .map((point) => `<circle class="${className}" cx="${point.x}" cy="${point.y}" r="3.2"></circle>`)
    .join("");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value) {
  const rounded = Math.round(value);
  if (rounded === 0) return "INR 0";
  return `${rounded > 0 ? "+" : "-"}${formatCurrency(Math.abs(rounded))}`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value) || value === 0) return "0.0%";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(1)}%`;
}

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function renderActionButton(rowId, actionLabel, selectedAction) {
  const normalized = actionLabel.toLowerCase();
  const active = selectedAction === actionLabel ? "active" : "";
  return `
    <button
      type="button"
      class="action-btn ${normalized} ${active}"
      data-row-id="${escapeHtml(rowId)}"
      data-action="${actionLabel}"
    >
      ${actionLabel}
    </button>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
