---
name: trader-plan-builder
version: 3.0.0
description: >
  Convert investment theses into swing trade plans with instrument mapping, technical confirmation,
  execution checklists, and explicit invalidation rules. All plans are draft until risk-governor approves.
dependencies:
  - analyst-thesis-engine
triggers:
  - triad:plan (via triad-orchestrator)
inputs:
  - intel/analysis/{today}/index.json
outputs:
  - intel/trade-plans/{today}/{planId}.json
  - intel/trade-plans/{today}/plans.json
metadata:
  { "openclaw": { "emoji": "📈" } }
---

# trader-plan-builder

> Convert theses into executable (but unapproved) swing trade plans.
> All output plans are `draft` or `watch`. This skill **cannot** bypass risk-governor to set `approved`.

---

## 1. Scope

| Does | Does Not |
|------|----------|
| Map theses to concrete instruments | Approve trade plans |
| Build entry/exit/invalidation conditions | Repeat the full thesis analysis |
| Assess regime, trend, support/resistance | Access real-time market data |
| Produce execution checklists | Execute trades |

---

## 2. Input

`intel/analysis/{today}/index.json`

If missing or empty → return: `今日暂无可计划事件`

---

## 3. Output

| File | Description |
|------|-------------|
| `intel/trade-plans/{today}/{planId}.json` | Individual plan file |
| `intel/trade-plans/{today}/plans.json` | Array of all plans for the day |

Each plan **must** conform to `DATA_CONTRACTS.md § 3. Trade Plan`.

---

## 4. Qualification Gate

A plan may be `draft` only if it satisfies all three conditions:

| # | Condition | If Missing |
|---|-----------|------------|
| 1 | Maps to a concrete instrument | → `watch` |
| 2 | Has specific execution conditions (not generic bullish/bearish) | → `watch` |
| 3 | Has a falsifiable invalidation condition | → `watch` |

---

## 5. Plan Types

| Type | When |
|------|------|
| `event-driven` | Direct catalyst with clear timing window |
| `trend-follow` | Aligning with an established directional move |
| `pullback` | Entering on a temporary retracement within a trend |
| `watch` | Conditions insufficient for any active setup |

---

## 6. Technical Confirmation (mandatory)

Every plan **must** address all five dimensions. No dimension may be skipped.

### 6.1 Regime

Classify current market environment:

| Value | Description |
|-------|-------------|
| `risk-on` | Broad risk appetite expanding |
| `risk-off` | Broad risk appetite contracting |
| `mixed` | Conflicting signals |
| `unclear` | Insufficient data to classify |

### 6.2 Trend

State:
- Directional status of the broad market, relevant sector, and target instrument.
- Whether this plan is with-trend or counter-trend.

### 6.3 Support / Resistance

Identify key price levels or condition levels relevant to entry, stop, and target.

### 6.4 Volume Confirmation

Specify what volume or turnover signal is required to validate the setup.
If real-time volume data is unavailable: `需人工确认`.

### 6.5 Time Stop

This system operates on swing timeframes only.
Default: `3-10d`. Must be specified on every plan.

---

## 7. Instrument Mapping

Priority order for selecting expression vehicle:

| Priority | Vehicle |
|----------|---------|
| 1 | Specific individual stock |
| 2 | Sector/industry ETF or index |
| 3 | Commodity or commodity ETF |
| 4 | If none are clear → `watch` |

**Rule**: Never fabricate a ticker symbol to fill the field.

---

## 8. Position Sizing

Default conservative:

| Confidence | Max Size |
|------------|----------|
| `high` + all conditions met | `medium` |
| `medium` | `small` |
| `low` | `watch` |

`large` is **forbidden** unless the user explicitly provides account size and risk budget.

---

## 9. Execution Checklist

Every plan **must** include at minimum these five items:

1. Does a concrete instrument exist?
2. Does the setup satisfy technical confirmation?
3. Does a clear invalidation condition exist?
4. Does this overlap with existing position themes?
5. Does volume/liquidity require manual confirmation?

---

## 10. Output Style

- Plans must be short, hard, and read like a trader's memo.
- Do not repeat the thesis analysis.
- If no qualified setup exists, output `watch`. Do not force an entry.
- All plans default to `status: draft`, awaiting `risk-governor` review.
