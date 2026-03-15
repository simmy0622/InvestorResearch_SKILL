---
name: risk-governor
version: 3.0.0
description: >
  Independent risk review for draft trade plans. Applies hard veto rules, checks risk boundaries,
  and assigns final status: approved / watch / rejected. No plan reaches approved without passing this skill.
dependencies:
  - trader-plan-builder
triggers:
  - triad:risk (via triad-orchestrator)
inputs:
  - intel/trade-plans/{today}/plans.json
outputs:
  - intel/risk/{today}/{reviewId}.json
  - intel/risk/{today}/reviews.json
  - updates intel/trade-plans/{today}/plans.json (status field)
metadata:
  { "openclaw": { "emoji": "🛡️" } }
---

# risk-governor

> Independent risk review with hard veto authority.
> This skill does not re-analyze the market. It applies constraint checks to decide whether a plan meets minimum risk standards.

---

## 1. Scope

| Does | Does Not |
|------|----------|
| Check each plan against 7 veto rules | Re-analyze market conditions |
| Enforce risk boundaries (position size, concentration) | Generate alternative trade ideas |
| Assign final status: approved / watch / rejected | Execute trades |
| Update plan status in `plans.json` | Override analyst or trader reasoning |

---

## 2. Input

`intel/trade-plans/{today}/plans.json`

---

## 3. Output

| File | Description |
|------|-------------|
| `intel/risk/{today}/{reviewId}.json` | Individual review file |
| `intel/risk/{today}/reviews.json` | Array of all reviews for the day |
| `intel/trade-plans/{today}/plans.json` | Status field updated per decision |

Each review **must** conform to `DATA_CONTRACTS.md § 4. Risk Review`.

---

## 4. Veto Rules

If **any** rule triggers, the plan **cannot** be `approved`.

| # | Rule | Condition | Result |
|---|------|-----------|--------|
| V1 | Missing Instrument | No concrete instrument specified | `watch` |
| V2 | Missing Invalidation | No falsifiable invalidation condition | `watch` |
| V3 | Missing Technical Confirmation | Lacks regime, support/resistance, or volume confirmation | `watch` |
| V4 | Source Disagreement | Upstream event has clear source conflicts or high uncertainty | `watch` or `rejected` |
| V5 | Liquidity Risk | Instrument has insufficient liquidity or unaddressed gap risk | `rejected` or `watch` |
| V6 | Correlated Exposure | Excessive same-theme, same-direction concentration | `watch` |
| V7 | Non-Falsifiable Thesis | Core thesis cannot be disproven; is only a vague judgment | `rejected` |

---

## 5. Default Risk Boundaries

Applied when the user has not specified a risk budget:

| Parameter | Default Limit |
|-----------|---------------|
| Single-plan `maxRiskPct` | `≤ 0.50%` |
| Same-theme, same-direction concurrent approvals | `≤ 2` |
| `large` position size | **Not approved** by default |
| `confidence: low` plans | **Not approved** — `watch` only |

---

## 6. Decision Values

| Decision | Meaning | Plan Status Update |
|----------|---------|-------------------|
| `approved` | Meets all risk standards. May proceed to execution observation or manual confirmation. | `approved` |
| `watch` | Logic is trackable but conditions are insufficient. | `watch` |
| `rejected` | Should not be pursued further. | `rejected` |

---

## 7. Review Process

For each plan in `plans.json`:

1. Run all 7 veto checks.
2. Verify risk boundaries.
3. Assign decision.
4. Record veto reasons (empty array if none).
5. Write brief risk note.
6. Update the plan's `status` field in `plans.json`.

---

## 8. Output Summary

After completion, output:

- Total plans reviewed
- Approved / watch / rejected counts
- Most frequent veto reason(s)
- List of plans that entered the executable observation pool
