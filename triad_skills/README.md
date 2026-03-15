# TradeTriad Skillset

> A-share swing-trade intelligence pipeline — from news ingestion to risk-reviewed execution plans.

Version: `3.0.0`
Platform: **OpenClaw**
Timezone: `Asia/Shanghai`
Language: 中文（skill 指令与分析产出默认中文；用户可切换为英文）

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    triad_orchestrator                        │
│         stage dispatch · state management · UI hook          │
├──────────┬──────────────┬────────────────┬──────────────────┤
│  scout   │   analyst    │    trader      │  risk_governor   │
│  intake  │   thesis     │    plan        │  veto / approve  │
│          │   engine     │    builder     │                  │
├──────────┴──────────────┴────────────────┴──────────────────┤
│                    contracts/DATA_CONTRACTS.md               │
│            shared schema · field types · invariants          │
└─────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

| Stage | Skill | Input | Output |
|-------|-------|-------|--------|
| 1. Retrieve | `scout-event-intake` | 3 fixed API sources | `raw` → `scored` + `archive` |
| 2. Analyze | `analyst-thesis-engine` | `scored` events | markdown notes + `index.json` |
| 3. Plan | `trader-plan-builder` | thesis `index.json` | draft trade plans |
| 4. Risk | `risk-governor` | draft plans | `approved` / `watch` / `rejected` |
| 5. UI | orchestrator hook | all artifacts | `artifact-bundle.js` → browser |

---

## Directory Structure

```text
triad_skills/
├── README.md
├── package.json
├── skills/
│   ├── triad_orchestrator/SKILL.md
│   ├── scout_event_intake/SKILL.md
│   ├── analyst_thesis_engine/SKILL.md
│   ├── trader_plan_builder/SKILL.md
│   └── risk_governor/SKILL.md
├── contracts/
│   └── DATA_CONTRACTS.md
├── examples/
│   ├── event.example.json
│   ├── thesis.example.json
│   ├── trade_plan.example.json
│   └── risk_review.example.json
└── intel/                          ← runtime workspace
    ├── data/
    │   ├── raw/{date}.json
    │   ├── scored/{date}.json
    │   ├── archive/{date}.json
    │   └── source-health/{date}.json
    ├── analysis/{date}/
    ├── trade-plans/{date}/
    ├── risk/{date}/
    ├── state/
    │   ├── current-run.json
    │   ├── workflow-log.json
    │   ├── dedup-hashes.json
    │   ├── last-crawl.json
    │   └── user-profile.json
    └── ui/
        ├── index.html
        ├── app.js
        ├── styles.css
        ├── data/artifact-bundle.js
        └── scripts/
```

---

## Installation

```bash
# Option A: workspace-local
cp -r skills/ <workspace>/skills/

# Option B: shared
cp -r skills/ ~/.openclaw/skills/
```

Then refresh skills or restart gateway.

---

## Deployment Modes

### Mode A — Single Agent

One agent loads all five skills. Simple, fast to deploy, but no permission isolation.

### Mode B — Multi-Agent (recommended for production)

| Agent | Skills |
|-------|--------|
| Scout | `scout-event-intake` |
| Analyst | `analyst-thesis-engine` |
| Trader | `trader-plan-builder` |
| Shared | `triad-orchestrator` + `risk-governor` |

---

## Commands

| Command | Description |
|---------|-------------|
| `triad:run` | Full pipeline: retrieve → analyze → plan → risk → UI |
| `triad:retrieve` | Fetch, normalize, deduplicate, score |
| `triad:analyze` | Generate theses from scored events |
| `triad:plan` | Build trade plans from theses |
| `triad:risk` | Risk review all draft plans |
| `triad:status` | Print current run state and artifact counts |

---

## Invariants

1. Every run generates a unique `runId` (`run_{YYYYMMDD}_{HHmmss}`).
2. All JSON files are written atomically (full overwrite, no partial edit).
3. Historical date directories are append-only; never retroactively modified.
4. A trade plan cannot reach `approved` without passing `risk-governor`.
5. A thesis without concrete instrument, technical confirmation, or invalidation condition can only output `watch`.
6. After any stage completes, `npm run triad:bundle-ui` **must** execute.
7. After `triad:run` completes, `npm run triad:open-ui` **must** execute.
