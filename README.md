# Restaurant Competitor Price Watcher

SaaS-style B2B dashboard for restaurant pricing teams.

## Product

Rule-based agent that monitors mock competitor prices across delivery apps and suggests competitive price adjustments.

## Core Features

- KPI Overview
  - Total Competitors Tracked
  - Average Competitor Price
  - Your Current Price
  - Recommended Price Adjustment (+/-)
- Competitor Price Table
  - Platform, Restaurant Name, Dish Name
  - Competitor Price, Your Price, Price Difference
  - Action Suggestion (Increase / Decrease / Maintain)
  - Sorting by competitor price
  - Filters by dish and platform
- Price Trend Visualization
  - Competitor average line
  - Your price line
- AI Pricing Recommendation Engine (rule-based, non-conversational)
  - Suggested new price
  - Percent difference from market average
  - Deterministic reasoning
- Locality Comparison
  - Average price by locality
  - High-demand premium zones
  - Opportunity areas

## Architecture

- `src/services/dataService.js`
  - Mock data generation
  - Simulated scraping function
  - Filtering and trend-series utilities
- `src/engines/recommendationEngine.js`
  - Adjustment logic
  - Action suggestions
  - Recommendation + locality insights
- `src/components/dashboardComponents.js`
  - KPI, table, chart, recommendation, and locality renderers
- `src/main.js`
  - State and interaction orchestration

## Rule Logic

`recommended_price = average_competitor_price - small_margin`

Current small margin: `INR 8`.

## Run

```bash
npm install
npm run dev
```
