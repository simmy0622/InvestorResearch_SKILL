---
name: analyst-thesis-engine
version: 3.0.0
description: >
  Transform scored market events into structured investment theses using a macro → industry → asset
  cross-validation framework. Outputs markdown research notes and a machine-readable thesis index.
dependencies:
  - scout-event-intake
triggers:
  - triad:analyze (via triad-orchestrator)
inputs:
  - intel/data/scored/{today}.json
outputs:
  - intel/analysis/{today}/{route}__{thesisId}.md
  - intel/analysis/{today}/index.json
metadata:
  { "openclaw": { "emoji": "🧠" } }
---

# analyst-thesis-engine

> Transform scored events into structured, cross-validated investment theses.
> This skill produces research notes and a thesis index — never trade plans or risk reviews.

---

## 1. Scope

| Does | Does Not |
|------|----------|
| Route events by type (macro / company / sector / scenario) | Generate trade plans |
| Produce three-layer analysis per event | Issue buy/sell signals |
| Cross-validate macro × industry × asset layers | Perform risk review |
| Output markdown notes + structured index | Access real-time market data |

---

## 2. Input

`intel/data/scored/{today}.json`

If missing or empty → return: `今日无待分析高优先级事件`

---

## 3. Output

| File | Description |
|------|-------------|
| `intel/analysis/{today}/{route}__{thesisId}.md` | One markdown note per event |
| `intel/analysis/{today}/index.json` | Array of Thesis Index Items per `DATA_CONTRACTS.md § 2` |

---

## 4. Routing

For each S/A event, assign a route. Priority order — first match wins:

| Route | Applies When |
|-------|-------------|
| `macro` | Central bank, rates, credit, fiscal, FX, regulation, policy, geopolitics, systemic shocks |
| `company` | Single-company events: earnings, buyback, M&A, restructuring, penalties, management changes |
| `sector` | Industry cycle, price transmission, supply-demand shifts, exports, capacity, thematic rotation |
| `scenario` | Insufficient evidence, unclear direction, high noise |

---

## 5. Three-Layer Analysis Framework (mandatory)

Every note **must** address all three layers plus cross-validation. No layer may be skipped.

### 5.1 Macro Layer

| Question | Required |
|----------|----------|
| Which macro factor is affected: growth, inflation, liquidity, regulatory expectations, or risk appetite? | yes |
| Is this a short-term impulse or a medium-term regime change? | yes |

### 5.2 Industry Layer

| Question | Required |
|----------|----------|
| Which industry or sub-industry is affected first? | yes |
| Transmission mechanism: demand, supply, price pass-through, cost, or valuation compression/expansion? | yes |
| Who benefits and who is harmed? | yes |

### 5.3 Asset Layer

| Question | Required |
|----------|----------|
| Which stocks, ETFs, commodities, or indices are the most direct expression vehicles? | yes |
| Is the impact beta or alpha? | yes |
| If no clear vehicle: state `只能观察，暂不交易化` | yes |

### 5.4 Cross-Validation

Must explicitly state:

| Item | Required |
|------|----------|
| Whether the three layers are aligned or in tension | yes |
| Which layer is the primary driver | yes |
| Which layer confirms/amplifies vs. which drags | yes |
| Which assumption is most fragile | yes |

---

## 6. Note Template

Filename: `{route}__{thesisId}.md`

```markdown
# 分析 | {title}

## 事件事实
## 宏观层判断
## 行业层判断
## 公司 / 资产层判断
## 三层交叉验证
## 核心判断
## 关键假设
## 反证条件
## 观察指标
## 下一步
```

---

## 7. Detail Standards

### 7.1 Length

| Scenario | Target Length |
|----------|-------------|
| Sufficient evidence | 1200–2200 Chinese characters |
| Complex event | May exceed 2200 |
| Insufficient evidence | May be shorter, but **must** explicitly state limitations |

### 7.2 Per-Section Requirements

| Section | Minimum Content |
|---------|----------------|
| 事件事实 | What happened + current market stage/timing window + why this matters now. Not a single-sentence recap. |
| 宏观层判断 | Transmission chain + beginning/continuation/end-stage + price/flow implications + weakest link. |
| 行业层判断 | Same four elements, at industry level. |
| 公司/资产层判断 | Same four elements, at asset level. Must name specific instruments or explicitly state none exist. |
| 三层交叉验证 | Primary driver + role of other layers (confirm/amplify/drag) + most likely failure point. |
| 核心判断 | Positive conclusion **and** qualifying conditions. Single-sided conclusions are **forbidden**. |
| 下一步 | 2–4 specific confirmation points, triggers, or scenario branches. Generic `继续观察` is **forbidden**. |

---

## 8. Anti-Patterns (forbidden)

| Pattern | Why |
|---------|-----|
| Headline restating | Analysis must add insight beyond the title. |
| "Important news" = "tradeable thesis" | Importance and tradeability are separate dimensions. |
| "News summary + one conclusion" format | Must show deductive reasoning chain. |
| Single-sided narrative without counter-scenario | At least one explicit counter-scenario required. |
| Omitting key dependencies (price levels, volume, flows) | If the thesis depends on it, it must be stated. |
| Claiming trend confirmation when conditions are unmet | Must state what confirmation is still missing. |
| Fabricating historical data or context | If unavailable, state the limitation. |

---

## 9. Quality Rules

| Rule | Detail |
|------|--------|
| Confidence | Insufficient evidence → `low` or `medium`. Never default to `high`. |
| Tradability | No clear asset mapping → `low`. |
| Context | May reference today's raw data. Longer-horizon gaps must be stated, not fabricated. |
| Language | Default Chinese. English only on explicit user request. |

---

## 10. Index Schema

Each item **must** conform to `DATA_CONTRACTS.md § 2. Thesis Index Item`.

### Stance Values

| Value | Meaning |
|-------|---------|
| `bullish` | Thesis direction is positive |
| `bearish` | Thesis direction is negative |
| `neutral` | No directional bias |
| `mixed` | Conflicting signals |

Stance represents thesis direction only — **not** a trade instruction.

---

## 11. Output Summary

After completion, output:

- Total analyses produced
- Route breakdown (macro / sector / company / scenario)
- Confidence breakdown (high / medium / low)
- Count of `tradability: high` theses
- Top 3 theses most suitable for the Plan stage
