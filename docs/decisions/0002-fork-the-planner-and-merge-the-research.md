---
id: 2
title: Fork Jamie's planner, merge the research into it, and end the documents-only phase
date: 2026-09-23
status: accepted
decided_by: owner
supersedes: 1
superseded_by: null
verified_at: null
---

## Context

Decision 0001 made this a documents-only research project because nobody here had read
Jamie's dashboard. Adam has since read it. Between 2026-09-14 and 2026-09-17 Jamie rebuilt
it into a React app on GitHub Pages with scheduled jobs for sportsbook lines, power ratings,
Circa's weekly Selections PDF and ESPN results, and eight passing test suites. Several
premises of the research (field data typed from a photo, a `win^10` popularity model, an
unknown EV formula) no longer describe it.

Checking the app against the research found that its EV is `w / E[survivors | win]`, not
the naive `a/p` that research finding 2 criticizes. Against exact enumeration on the real
Week 1 and Week 2 fields it lands within a few percent but under-credits non-chalk picks,
enough to reorder the top candidates. The future-value and DILI terms rest on nine hand-set
constants. Those are the gaps worth closing, and they live in pure model functions.

Jamie suggested forking rather than coordinating changes through his repository, which he
changes several times a day.

## Decision

The planner is forked to `adamMgross/circa-survivor` and developed independently. Jamie's
repository is the `upstream` remote with pushing disabled, and it is not synced. A fix from
upstream is copied by hand when it is wanted.

The football-survivor research repository is merged into the fork with its history. The
research, the decision records and the `tk` queue now live beside the app.

The documents-only phase ends. Code is written in this repository, starting with extracting
the model from `src/CircaSurvivorPlanner.jsx` as a behavior-preserving change before any
model change lands. Jamie's current formulas are kept as a named baseline that every model
change is measured against.

## Consequences

- Nothing is proposed back to Jamie's repository. Results are shared with him as findings.
- Jamie still submits picks at Circa and holds the contest relationship, so when this app
  and his disagree the syndicate needs an agreed tie-breaker. That is part of `fs-d7a3`.
- The fork runs its own scheduled jobs and needs its own `ODDS_API_KEY`.
- `VISION.md` and `STATE.md` were written for a documents-only project and are rewritten
  when the repository is onboarded to the portfolio layout.

## Alternatives rejected

**Contribute to Jamie's repository through pull requests.** The plan until 2026-09-23.
Rejected once Jamie offered the fork, because it put every model change behind merge
coordination with a repository that changes daily, and would have kept the structural
refactor his decision.

**Keep the research in its own repository beside the fork.** Rejected because it splits one
project across two ticket queues, and the research now needs code in this repository to
test its claims.
