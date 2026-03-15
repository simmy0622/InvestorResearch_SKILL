# Data Contracts

> Shared schema definitions for all TradeTriad skills.
> Every skill **must** conform to these structures. Fields marked `required` cannot be omitted.

Schema version: `1.0`

---

## 1. Event Object

Produced by: `scout-event-intake`
Consumed by: `analyst-thesis-engine`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `runId` | `string` | yes | Format: `run_{YYYYMMDD}_{HHmmss}` |
| `eventId` | `string` | yes | Format: `{source}:{YYYYMMDD}-{seq}`. Must be globally unique. |
| `source` | `enum` | yes | `eastmoney-news` \| `sina-finance` \| `10jqka-news` |
| `title` | `string` | yes | Trimmed, no excess whitespace. |
| `summary` | `string` | yes | Max 200 characters. |
| `url` | `string` | yes | Original source URL. |
| `publishedAt` | `ISO 8601` | yes | With `+08:00` offset. |
| `crawledAt` | `ISO 8601` | yes | With `+08:00` offset. |
| `categoryHint` | `enum` | yes | `macro` \| `sector` \| `company` \| `scenario` \| `unknown` |
| `meta` | `object` | yes | See sub-fields below. |
| `scores` | `object` | yes | See sub-fields below. |

### `meta` sub-fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyFlag` | `boolean` | yes | `true` if title/summary matches policy keywords. |
| `heat` | `number \| null` | no | Source-provided popularity metric. |
| `secCode` | `string \| null` | no | Only if source explicitly provides stock code. |
| `secName` | `string \| null` | no | Only if source explicitly provides stock name. |
| `tags` | `string[]` | yes | Extracted topic tags. |

### `scores` sub-fields

| Field | Type | Range | Weight | Required |
|-------|------|-------|--------|----------|
| `timeliness` | `integer` | 0–10 | ×2.0 | yes |
| `impact` | `integer` | 0–10 | ×2.5 | yes |
| `certainty` | `integer` | 0–10 | ×2.0 | yes |
| `relevance` | `integer` | 0–10 | ×1.5 | yes |
| `surprise` | `integer` | 0–10 | ×1.5 | yes |
| `tradability` | `integer` | 0–10 | ×1.5 | yes |
| `total` | `number` | 0–110 | — | yes |
| `grade` | `enum` | — | — | yes |

**Grade thresholds**: `S ≥ 85`, `A ≥ 68`, `B ≥ 45`, `C < 45`

**Total formula**: `timeliness×2.0 + impact×2.5 + certainty×2.0 + relevance×1.5 + surprise×1.5 + tradability×1.5`

---

## 2. Thesis Index Item

Produced by: `analyst-thesis-engine`
Consumed by: `trader-plan-builder`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `runId` | `string` | yes | |
| `thesisId` | `string` | yes | Format: `ths_{YYYYMMDD}_{seq}`. Must be globally unique. |
| `eventId` | `string` | yes | Source event reference. |
| `route` | `enum` | yes | `macro` \| `sector` \| `company` \| `scenario` |
| `primaryDriver` | `enum` | yes | `macro` \| `industry` \| `company` |
| `title` | `string` | yes | Chinese by default. |
| `stance` | `enum` | yes | `bullish` \| `bearish` \| `neutral` \| `mixed` |
| `confidence` | `enum` | yes | `high` \| `medium` \| `low` |
| `tradability` | `enum` | yes | `high` \| `medium` \| `low` |
| `instrumentCandidates` | `string[]` | yes | Concrete symbols/names. Empty array if none. |
| `notePath` | `string` | yes | Relative path to markdown note. |
| `keyAssumption` | `string` | yes | Single most important assumption. |
| `keyRisk` | `string` | yes | Single most important risk. |

---

## 3. Trade Plan

Produced by: `trader-plan-builder`
Consumed by: `risk-governor`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `runId` | `string` | yes | |
| `planId` | `string` | yes | Format: `pln_{YYYYMMDD}_{seq}`. Must be globally unique. |
| `eventId` | `string` | yes | |
| `thesisId` | `string` | yes | |
| `instrument` | `string` | yes | Concrete symbol, or `"watch"` if unmapped. |
| `direction` | `enum` | yes | `long` \| `short` \| `watch` |
| `setup` | `enum` | yes | `event-driven` \| `trend-follow` \| `pullback` \| `watch` |
| `regime` | `enum` | yes | `risk-on` \| `risk-off` \| `mixed` \| `unclear` |
| `trend` | `string` | yes | Market/sector/instrument directional state + trend alignment. |
| `entryTrigger` | `string` | yes | Specific trigger condition. |
| `entryZone` | `string` | yes | Price range or condition. |
| `stopLoss` | `string` | yes | Hard stop or conditional stop. |
| `targetZone` | `string` | yes | Target range. |
| `timeStop` | `string` | yes | Default `"3-10d"`. |
| `positionSize` | `enum` | yes | `small` \| `medium` \| `large` \| `watch` |
| `maxRiskPct` | `string` | yes | `"0.25%"` \| `"0.50%"` \| `"watch"` |
| `supportResistance` | `string` | yes | Key levels description. |
| `volumeConfirmation` | `string` | yes | Volume condition, or `"需人工确认"`. |
| `invalidation` | `string` | yes | Core falsification condition. |
| `executionChecklist` | `string[]` | yes | Min 5 items (see skill spec). |
| `confidence` | `enum` | yes | `high` \| `medium` \| `low` |
| `status` | `enum` | yes | `draft` \| `approved` \| `watch` \| `rejected` |

---

## 4. Risk Review

Produced by: `risk-governor`
Consumed by: orchestrator (updates plan status)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `runId` | `string` | yes | |
| `reviewId` | `string` | yes | Format: `rrv_{YYYYMMDD}_{seq}`. Must be globally unique. |
| `planId` | `string` | yes | Reference to reviewed plan. |
| `instrument` | `string` | yes | |
| `decision` | `enum` | yes | `approved` \| `watch` \| `rejected` |
| `vetoReasons` | `string[]` | yes | Empty array if no veto. |
| `checks` | `object` | yes | See sub-fields below. |
| `note` | `string` | yes | Brief risk assessment. |

### `checks` sub-fields

| Field | Type | Required |
|-------|------|----------|
| `missingInstrument` | `boolean` | yes |
| `missingInvalidation` | `boolean` | yes |
| `missingTechnicalConfirmation` | `boolean` | yes |
| `sourceDisagreement` | `boolean` | yes |
| `liquidityRisk` | `boolean` | yes |
| `correlatedExposure` | `boolean` | yes |

---

## 5. Workflow Log

Managed by: `triad-orchestrator`
Path: `intel/state/workflow-log.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `currentRunId` | `string` | yes | |
| `lastRetrieveAt` | `ISO 8601` | yes | |
| `lastAnalyzeAt` | `ISO 8601` | yes | |
| `lastPlanAt` | `ISO 8601` | yes | |
| `lastRiskReviewAt` | `ISO 8601` | yes | |
| `stageErrors` | `array` | yes | See sub-structure below. Empty array if no errors. |

### `stageErrors` item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stage` | `enum` | yes | `retrieve` \| `analyze` \| `plan` \| `risk` \| `bundle-ui` |
| `runId` | `string` | yes | |
| `error` | `string` | yes | Human-readable error description. |
| `occurredAt` | `ISO 8601` | yes | |

---

## 6. Source Health

Produced by: `scout-event-intake`
Consumed by: `triad-orchestrator` (for `triad:status`)
Path: `intel/data/source-health/{date}.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `generatedAt` | `ISO 8601` | yes | |
| `sources` | `array` | yes | One entry per configured source. |

### `sources` item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `enum` | yes | `eastmoney-news` \| `sina-finance` \| `10jqka-news` |
| `status` | `enum` | yes | `ok` \| `error` \| `timeout` |
| `fetchedCount` | `integer` | yes | Number of events fetched. `0` on failure. |
| `parseOk` | `boolean` | yes | Whether response parsed successfully. |
| `errorMessage` | `string \| null` | yes | `null` on success. |

---

## 7. Current Run

Managed by: `triad-orchestrator`
Path: `intel/state/current-run.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | yes | `"1.0"` |
| `currentRunId` | `string` | yes | |
| `runId` | `string` | yes | Same as `currentRunId`. |
| `stage` | `enum` | yes | `retrieve` \| `analyze` \| `plan` \| `risk` \| `completed` |
| `status` | `enum` | yes | `running` \| `completed` \| `failed` |
| `scope` | `string` | yes | Freeform scope label. |
| `mode` | `string` | yes | Trigger command, e.g. `triad:run`. |
| `market` | `string` | yes | Target market, e.g. `A-share`. |
| `startedAt` | `ISO 8601` | yes | |
| `updatedAt` | `ISO 8601` | yes | |
| `finishedAt` | `ISO 8601 \| null` | yes | `null` while running. |

---

## Invariants

These rules **cannot** be violated by any skill:

1. `schemaVersion` is required on every contract object.
2. `runId` is required on every contract object.
3. `eventId`, `thesisId`, `planId`, `reviewId` must be globally unique within a run.
4. `trade plan.status` defaults to `draft`. Only `risk-governor` may set it to `approved`.
5. `instrument` must be a concrete symbol; if unknown, use `"watch"`.
6. All `ISO 8601` timestamps must include the `+08:00` offset.
