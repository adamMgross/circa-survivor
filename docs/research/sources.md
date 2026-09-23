# Sources

Everything cited in this research pass, with what it was used for and how far to trust it.
Retrieved 2026-09-16 unless noted.

## Primary, authoritative

**Circa Survivor 2026 official contest rules**, revision 6/19/2026.
`https://www.circasports.com/wp-content/uploads/2026/06/CircaSportsSurvivorContest.2026-FinalRules-19-JUNE-2026.pdf`
The source for every rule claim in `01-contest-mechanics.md`. Rule 19(d) is the payout
lattice, rules 7-9 the holiday legs and their team lists, 12-13 the deadlines, 3 and 10 the
multi-entry terms, 15(a) the repeat-pick disqualification, 29 hedging with casino credit.
Rule 30 says Circa may update the rules at any time and entrants are responsible for
checking, so re-fetch and diff this file periodically.

**Circa weekly team availability files.**
`https://www.circasports.com/wp-content/uploads/<YYYY>/<MM>/Circa-Survivor-<YYYY>-Week-<N>-Team-Availability.pdf`
The aggregate availability row plus every live entry by alias with its used teams. Verified
present for 2026 week 2, 2025 weeks 2-6 and 9-18, and spot-checked for 2024. Not an API, so
treat the URL pattern as convention rather than contract.

**Circa season winner files.**
2025 `https://www.circasports.com/wp-content/uploads/2026/01/Circa-Survivor-2025-Winners.pdf`
2024 `https://www.circasports.com/wp-content/uploads/2025/01/Circa-Survivor-2024-Winners.pdf`
2023 `https://www.circasports.com/wp-content/uploads/2024/01/Circa-Survivor-2023-Winners.pdf`
Winner counts and per-winner prizes, from which entry counts and implied field survival rates
in `01-contest-mechanics.md` are derived. 2021 and 2022 results are posted only as Twitter
images and were not retrieved.

## Academic

**Clair, B. and Letscher, D. (2007). Optimal Strategies for Sports Betting Pools.**
Operations Research 55(6) 1163-1177. Full text at
`https://www.stat.berkeley.edu/~aldous/157/Papers/clair.pdf`
The derivation of "bet the edge": in a one-game pool as the number of competitors grows, the
expected return on the favorite is `a/p` and on the underdog `(1-a)/(1-p)`. Their equation
3.1 gives the finite-`N` threshold that interpolates from `a = 1/2` at `N = 1` to `a = p` in
the limit, which is the formal statement of "pool size decides how contrarian to be". Also
the empirical finding that in a 9,000-person ESPN pool almost every possible entry had an
expected return above one, because the crowd concentrates on a few bad picks. Their pool
types are weekly pick-em and single-elimination brackets, not survivor, so the model does not
transfer, only the mechanism.

**Bergman, D. and Imbrogno, J. (2017). Surviving a National Football League Survivor Pool.**
Operations Research 65(5) 1343-1354.
`https://pubsonline.informs.org/doi/10.1287/opre.2017.1633`
The survivor pool as a sequential stochastic assignment problem, with binary optimization
models over the season's assignment. Headline computational result is that a rolling
look-ahead of roughly eight weeks dominates both myopic play and full-season planning.
Objective is survival probability, not payout, which is the gap this project exists in.
Paywalled. Read via the UConn summary at
`https://www.business.uconn.edu/2017/10/31/a-winning-football-pool-strategy/` and abstracts.
The primary text should be obtained before anything depends on its details.

**Decary, J., Bergman, D., Cardonha, C., Imbrogno, J. and Lodi, A. (2024). The Madness of
Multiple Entries in March Madness.** arXiv:2407.13438.
`https://arxiv.org/pdf/2407.13438`
Multi-entry strategy for a top-heavy pool. Proposition 1 proves the expected-maximum-score
objective is monotone submodular, which justifies greedy. Remark 1 shows the best single
entry need not belong to the optimal two-entry set. Theorem 2 shows disjoint entries are
optimal when every matchup is a coin flip, and Remark 3 that no diversity is needed when
outcomes are near-certain, so required diversification scales with how close probabilities
are to one half. Their objective is the maximum over entries and ours is a sum, so the
theorems are guidance rather than results we inherit.

**Haugh, M. and Singal, R. (2021). How to Play Fantasy Sports Strategically (and Win).**
Management Science 67(1) 72-92.
`http://www.columbia.edu/~mh2078/DFS_Revision_1_May2019.pdf`
Portfolio construction against a modeled field in a top-heavy contest. The Dirichlet-
multinomial model of opponent selections, with parameters from Dirichlet regression, is the
device borrowed in `04-inputs-field-model.md` for alias-level lumpiness.

**Hunter, D., Vielma, J. and Zaman, T. Picking Winners in Daily Fantasy Sports Using Integer
Programming.** arXiv:1604.01455. `https://arxiv.org/pdf/1604.01455`
Multi-entry portfolio selection under a top-heavy payoff by integer programming. Background
for the endgame joint optimization.

## Public tooling and commentary

Useful for what the field reads, which makes it an input to the field model, and for
confirming that nobody public solves the actual problem.

**PoolGenius / TeamRankings**, `https://poolgenius.teamrankings.com/circa-survivor-picks/`.
Circa-specific tooling and path planning. Their expected-value article is the closest public
statement of the right framework. Both pages returned 403 to automated fetches.

**Subvertadown**, `https://subvertadown.com/article/survivor-pool-strategy`. Optimizes
expected longevity, which front-loads high probabilities and is explicitly a different
objective from payout. Useful as a named benchmark to beat.

**Unabated**, `https://unabated.com/post/your-survivor-contest-strategy`. Circa-specific
strategy including the holiday gauntlets and the overlay arithmetic.

**Survivor Grid**, `https://www.survivorgrid.com/strategy`. Public pick popularity across
pools, a leading indicator for the field model.

**VSiN**, `https://vsin.com/circa-survivor/`. Weekly Circa coverage, elimination counts, and
Circa operations quotes.

## Week 1 2026 reporting

Used for the Chargers elimination count, which is not in the availability file because
eliminated entries are dropped from it.

`https://www.covers.com/industry/cardinals-upset-of-chargers-eliminates-30-percent-of-circa-survivor-contest-in-week-1-sept-14-2026`
`https://www.reviewjournal.com/business/business-columns/inside-gaming/inside-gaming-chargers-loss-wipes-out-10-3m-in-circa-survivor-entries-3886508/`
`https://www.espn.com/espn/betting/story/_/id/49785676/nfl-survivor-betting-circa-sportsbook-las-vegas-2026`

Press figures do not fully reconcile: 8,032 eliminations reported against 8,039 implied by
the availability file, and named losing cohorts summing to 7,816 of the 8,032. Prefer the
file.

## Data and methods references

**The Odds API**, `https://the-odds-api.com/liveapi/guides/v4/` and
`https://the-odds-api.com/historical-odds-data/`. Moneyline, spreads and totals, historical
snapshots for featured markets back to mid-2020, which covers every Circa Survivor season.
Historical access is on the paid tier.

**De-vigging methods.** Multiplicative, additive, Shin and power, compared at
`https://betherosports.com/blog/devigging-methods-explained` and
`https://help.outlier.bet/en/articles/8208129-how-to-devig-odds-comparing-the-methods`.
Consistent across sources that power and Shin are better calibrated on lopsided lines, which
is the regime every survivor candidate sits in. Secondary sources, so the claim is treated as
a hypothesis to score rather than a fact.

**NFL margin distribution.** Standard deviation near 13.5 points, with roughly 14 to 15
percent of games decided by exactly 3 and about 9 percent by exactly 7.
`https://www.nfeloapp.com/analysis/margin-probabilities-from-nfl-spreads/` and
`https://www.covers.com/nfl/key-numbers`.

## Not yet obtained

- Bergman and Imbrogno (2017) primary text.
- Circa Survivor 2021 and 2022 results, posted only as images.
- Circa availability files for 2025 weeks 1, 7 and 8, and anything before 2024.
- A head-to-head scoring of market probabilities against nfelo and ESPN FPI.
