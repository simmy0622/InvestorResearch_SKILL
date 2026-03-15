---
name: scout-event-intake
version: 3.0.0
description: >
  Fetch A-share financial news from three fixed API sources, normalize into Event Objects,
  deduplicate against history, score on six dimensions, and partition into scored/archive tiers.
dependencies: []
triggers:
  - triad:retrieve (via triad-orchestrator)
inputs:
  - intel/state/dedup-hashes.json
  - intel/state/user-profile.json
outputs:
  - intel/data/raw/{today}.json
  - intel/data/scored/{today}.json
  - intel/data/archive/{today}.json
  - intel/data/source-health/{today}.json
  - intel/state/last-crawl.json
  - intel/state/dedup-hashes.json
metadata:
  { "openclaw": { "emoji": "🛰️" } }
---

# scout-event-intake

> Fetch → normalize → deduplicate → score → archive.
> This skill never produces analysis or trade plans.

---

## 1. Scope

| Does | Does Not |
|------|----------|
| Fetch from fixed sources | Analyze events |
| Normalize to Event Object schema | Generate theses or trade plans |
| Deduplicate against rolling 7-day history | Make trading recommendations |
| Score on 6 weighted dimensions | |
| Partition into S/A (scored) and B/C (archive) | |
| Report source health | |

---

## 2. Sources

Fetch in order. Single-source failure **must not** block remaining sources.

| # | Name | Endpoint |
|---|------|----------|
| 1 | 东方财富 | `https://np-listapi.eastmoney.com/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=350&order=1&needInteractData=0&page_index=1&page_size=20&req_trace={unix_timestamp}` |
| 2 | 新浪财经 | `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2516&k=&num=20&page=1` |
| 3 | 同花顺 | `https://news.10jqka.com.cn/tapp/news/push/stock/?page_size=20&track=website&page=1` |

Request header:

```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
```

---

## 3. Normalization

Every event **must** conform to `DATA_CONTRACTS.md § 1. Event Object`.

### Field rules

| Field | Rule |
|-------|------|
| `title` | Trim whitespace, collapse repeated spaces. |
| `summary` | Max 200 characters. |
| `policyFlag` | Set `true` if title or summary matches: `降准\|降息\|利率\|准备金\|货币政策\|MLF\|LPR\|央行\|监管\|证监会` |
| `secCode` / `secName` | Populate **only** when source data explicitly provides them. Never infer. |
| `eventId` | Format: `{source}:{YYYYMMDD}-{seq}`. Must be unique within the run. |

---

## 4. Deduplication

Read `intel/state/dedup-hashes.json`.

### Algorithm

1. Normalize title: strip whitespace, convert full-width to half-width, lowercase.
2. Dedup key: `normalized_title[:40] + "|" + source`
3. Keep first occurrence; discard later duplicates.
4. Purge hash entries older than 7 days.
5. Write back as full overwrite.

### Cross-source policy

- Same event from different sources is **not** a duplicate.
- Cross-source merge is allowed **only** when titles are near-identical and URLs provide no additional information.

---

## 5. Scoring

### 5.1 Fast-track

If title or summary matches any of these high-priority keywords, the event enters the candidate pool directly — but scores **must** still be calibrated per dimension (no automatic full marks):

`降准、降息、利率调整、存款准备金、货币政策委员会、MLF、LPR、熔断、千股跌停、千股涨停、证监会、重大违法、退市`

### 5.2 Dimensions

| Dimension | Meaning | Weight | Constraints |
|-----------|---------|--------|-------------|
| `timeliness` | Freshness | ×2.0 | |
| `impact` | Scope and intensity of potential effect | ×2.5 | Must be assessed per-event. Batch-defaulting to 5 is **forbidden**. |
| `certainty` | Confidence in the information | ×2.0 | Source hierarchy: official announcement > exchange > mainstream media > aggregator. |
| `relevance` | Match to watchlist or focus themes | ×1.5 | Read `user-profile.json.watchlist`. Default to 4 (not 5) when watchlist is empty. |
| `surprise` | Deviation from existing consensus | ×1.5 | "Important" ≠ "surprising". Must assess consensus gap. |
| `tradability` | Clear mapping to a tradeable instrument | ×1.5 | "Important" ≠ "tradeable". Low score if no clear asset mapping. |

### 5.3 Formula

```
total = timeliness×2.0 + impact×2.5 + certainty×2.0 + relevance×1.5 + surprise×1.5 + tradability×1.5
```

### 5.4 Grades

| Grade | Threshold |
|-------|-----------|
| S | `≥ 85` |
| A | `≥ 68` |
| B | `≥ 45` |
| C | `< 45` |

---

## 6. Archiving

| Destination | Events |
|-------------|--------|
| `raw/{today}.json` | All events |
| `scored/{today}.json` | S + A grade |
| `archive/{today}.json` | B + C grade |

---

## 7. Source Health

Write `source-health/{today}.json` per `DATA_CONTRACTS.md § 6. Source Health`.

One entry per configured source, regardless of success or failure.

---

## 8. Error Recording

If any source fails to fetch or parse:

1. Record in `source-health` (status: `error` or `timeout`).
2. Append to `intel/state/workflow-log.json → stageErrors`:

```json
{
  "stage": "retrieve",
  "runId": "<current runId>",
  "error": "<source name>: <error description>",
  "occurredAt": "<ISO 8601>"
}
```

If **all** sources fail, the entire Retrieve stage is marked as failed and the summary **must** state this explicitly.

---

## 9. Output Summary

After completion, output:

- Successful / failed sources (with per-source `fetchedCount`)
- Total fetched
- Post-dedup count
- S / A / B / C breakdown
- Top 3 events most likely to advance to analysis
