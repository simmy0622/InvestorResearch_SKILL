---
name: triad-orchestrator
version: 3.0.0
description: >
  Coordinate the full TradeTriad pipeline: retrieve → analyze → plan → risk → UI.
  Dispatches to sub-skills, manages run state, enforces stage ordering, and outputs run summaries.
dependencies:
  - scout-event-intake
  - analyst-thesis-engine
  - trader-plan-builder
  - risk-governor
triggers:
  - triad:retrieve
  - triad:analyze
  - triad:plan
  - triad:risk
  - triad:run
  - triad:status
inputs: []
outputs:
  - intel/state/current-run.json
  - intel/state/workflow-log.json
metadata:
  { "openclaw": { "emoji": "♟️" } }
---

# triad-orchestrator

> Stage dispatch, state management, and run lifecycle control.
> This skill never performs deep analysis or trade logic — it delegates to sub-skills and enforces ordering.

---

## 1. Triggers

| Command | Stages Executed | Description |
|---------|-----------------|-------------|
| `triad:retrieve` | Retrieve only | Fetch, normalize, deduplicate, score |
| `triad:analyze` | Analyze only | Generate theses from today's scored events |
| `triad:plan` | Plan only | Build trade plans from today's theses |
| `triad:risk` | Risk only | Risk-review all draft plans |
| `triad:run` | All + UI | Full pipeline in strict order |
| `triad:status` | None (read-only) | Print current state and artifact counts |

---

## 2. Delegation

Each stage **must** follow the rules defined in the corresponding sub-skill. This skill dispatches; it does not duplicate their logic.

| Stage | Delegates To |
|-------|--------------|
| Retrieve | `scout-event-intake` |
| Analyze | `analyst-thesis-engine` |
| Plan | `trader-plan-builder` |
| Risk | `risk-governor` |

---

## 3. Workspace Paths

All paths relative to workspace root. Timezone: `Asia/Shanghai`.

### Data

| Path | Description |
|------|-------------|
| `intel/data/raw/{today}.json` | All fetched events |
| `intel/data/scored/{today}.json` | S/A grade events |
| `intel/data/archive/{today}.json` | B/C grade events |
| `intel/data/source-health/{today}.json` | Per-source health report |

### Artifacts

| Path | Description |
|------|-------------|
| `intel/analysis/{today}/` | Thesis markdown notes + `index.json` |
| `intel/trade-plans/{today}/` | Trade plan JSONs + `plans.json` |
| `intel/risk/{today}/` | Risk review JSONs + `reviews.json` |

### State

| Path | Description |
|------|-------------|
| `intel/state/current-run.json` | Active run metadata |
| `intel/state/workflow-log.json` | Stage timestamps + error log |
| `intel/state/dedup-hashes.json` | Deduplication hash store |
| `intel/state/user-profile.json` | Watchlist and user preferences |

### UI

| Path | Description |
|------|-------------|
| `intel/ui/index.html` | Frontend entry point |
| `intel/ui/data/artifact-bundle.js` | Bundled data for frontend |

---

## 4. Run ID

Each `triad:run` invocation generates a new run ID before any stage executes:

```
run_{YYYYMMDD}_{HHmmss}
```

Written to:
- `intel/state/current-run.json`
- `intel/state/workflow-log.json` → `currentRunId`

All four stages within a single run **must** use the same `runId`.

---

## 5. Stage Rules

### 5.1 triad:retrieve

- Execute Retrieve stage only.
- **Must not** generate analysis or trade plans.
- On completion, output:
  - Total fetched count
  - Post-dedup count
  - S / A / B / C breakdown
  - Failed source count
- **Terminal step**: execute `npm run triad:open-ui`. Stage is incomplete until this succeeds.

### 5.2 triad:analyze

- Read `intel/data/scored/{today}.json` only.
- If input is empty or missing, return: `今日无待分析高优先级事件`
- Analysis notes **must** be detailed (see `analyst-thesis-engine` spec).
- **Must not** advance to Plan stage.
- **Terminal step**: execute `npm run triad:open-ui`. Stage is incomplete until this succeeds.

### 5.3 triad:plan

- Read `intel/analysis/{today}/index.json` only.
- Each thesis produces at most one `draft` trade plan.
- **Must not** set any plan to `approved`.
- **Terminal step**: execute `npm run triad:open-ui`. Stage is incomplete until this succeeds.

### 5.4 triad:risk

- Read `intel/trade-plans/{today}/plans.json` only.
- Review each plan and update its `status`:
  - Pass → `approved`
  - Fail → `watch` or `rejected`
- **Terminal step**: execute `npm run triad:open-ui`. Stage is incomplete until this succeeds.

### 5.5 triad:run

Execute in strict order. No stage may be skipped or reordered:

1. Retrieve
2. Analyze
3. Plan
4. Risk review
5. `npm run triad:open-ui` (bundles automatically, then opens browser)
6. Output Chinese-language run summary

---

## 6. UI Hook

`npm run triad:open-ui` bundles data and opens the browser in one step. It is embedded as the **terminal step** of every stage in § 5 above.

- If `triad:open-ui` fails: report the error in the summary **and** output fallback path `intel/ui/index.html` for manual opening.
- A stage that has not executed its terminal step is **incomplete**. The agent must not output a summary or advance to the next stage until the UI hook has run.

---

## 7. triad:status Output

Must include all of the following:

| Item | Source |
|------|--------|
| Today's raw / scored / archive counts | `intel/data/` |
| Analysis note count | `intel/analysis/{today}/` |
| Trade plan count | `intel/trade-plans/{today}/` |
| Risk review count | `intel/risk/{today}/` |
| Last retrieve / analyze / plan / risk timestamps | `workflow-log.json` |
| Approved / watch / rejected counts | `reviews.json` |
| Current `runId` | `current-run.json` |
| Source health per source | `source-health/{today}.json` |
| Stage errors (if any) | `workflow-log.json.stageErrors` |

---

## 8. Idempotency

- Historical date directories are **never** retroactively modified.
- If the same `runId` re-executes a stage:
  - Read existing artifacts and reuse if complete.
  - Rebuild only if missing or detectably incomplete.
- All JSON files are written as full overwrites (no partial edits).
- Any stage failure **must** be recorded in state. Silent skip is forbidden.

---

## 9. Summary Style

Output concise, console-style run summaries. Not long-form analysis.

Example:

```
抓取 58 条，去重后 41 条，晋级 S/A 9 条。
生成 9 份分析，7 份交易计划。
风控通过 3 份，watch 4 份，拒绝 0 份。
UI bundle 已刷新，前端已打开。
```
