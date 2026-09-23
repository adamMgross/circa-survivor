# Input two: the field

The transcript calls this the hardest input: the casino tweets a photo once a week and Jamie
types it into the dashboard. That is not the situation. Circa publishes the complete joint
state of the field as a machine-readable file at a predictable URL, every week, including
every prior season. This is the largest single finding in the research pass, and it changes
what the field model has to do.

## What Circa actually publishes

```
https://www.circasports.com/wp-content/uploads/<YYYY>/<MM>/Circa-Survivor-<YYYY>-Week-<N>-Team-Availability.pdf
```

Verified live during this research pass. The 2026 Week 2 file is 25 MB and 24,313 lines of
extracted text. It contains two things.

**An aggregate row.** For each of the 32 teams, the count and percentage of live entries
that have not yet used it.

**Every live entry, by name, with an X under every team it has used.** All 16,978 of them.

That second table is the joint distribution over the field's remaining team sets, observed
exactly, not estimated. No maximum-entropy reconstruction, no iterative proportional fitting,
no inference from marginals. The thing every survivor tool in existence has to guess at is
published.

Archive coverage, probed directly:

| Season | Weeks found |
|---|---|
| 2026 | 2 (in progress) |
| 2025 | 2-6, 9-18. Missing 1, 7, 8 |
| 2024 | spot-checked 2 and 10, present |

The gaps are probably a different month directory or filename and are worth one more probe
before concluding they do not exist. Even with the gaps this is a backtest corpus of tens of
thousands of entry-weeks per season, with the choice set attached to every observation.

Two cautions. The file is an Excel print, so column alignment in extracted text is not
reliable and the parser should use word positions, not whitespace layout. And the filename
convention is Circa's, not an API, so it can change without notice. Fetch, archive raw, and
parse from the archive.

One operational benefit: our own three entries appear in the file under their aliases, so
the official record of what we have used is machine-checkable against what the dashboard
thinks. Rule 15(a) disqualifies an entrant for a repeat pick and Circa explicitly refuses to
backstop its own software on it, so this check is worth wiring in.

## What the 2026 field has done

Derived from the Week 2 availability file. 16,978 entries alive out of 25,017, so 8,039
eliminated in Week 1. Every surviving entry's Week 1 pick is recoverable exactly, because
availability went from 100 percent to whatever the file reports.

| Team | Week 1 picks, surviving | Share of survivors |
|---|---|---|
| JAX | 8,127 | 47.9% |
| PIT | 4,013 | 23.6% |
| DET | 1,771 | 10.4% |
| LV | 1,308 | 7.7% |
| PHI | 784 | 4.6% |
| CIN | 351 | 2.1% |
| SEA | 174 | 1.0% |
| others | 450 | 2.7% |

The losing side is not in the file, but press reporting puts the Chargers at 7,585 entries,
30.3 percent of the original field, the largest single-pick loss in Circa contest history.
So Week 1 of 2026 was roughly Jaguars 32.5 percent, Chargers 30.3 percent, Steelers 16.0
percent. **Three teams held 79 percent of a 25,017-entry field.** That is the concentration
regime in which the contrarian term is worth the most, and the field walked straight into it.

## The field is 5,250 decision-makers, not 17,000 entries

Entry names carry an owner alias and an index, so they group. Among the 16,975 surviving
entries that parse cleanly:

```
distinct aliases                         5,250
mean surviving entries per alias          3.23
aliases with 1 surviving entry            1,985   (the mode)
aliases with 10 surviving entries           348
```

The transcript says the mode is ten entries per person. Among survivors it is one. This
matters for more than trivia: the decision unit is the alias, and entries under one alias
are highly correlated.

How correlated, measured on the 265 aliases whose ten entries all survived Week 1:

```
all 10 entries on 1 team     153 aliases   57.7%
2 distinct teams              62            23.4%
3 distinct teams              32            12.1%
4 or more                     18             6.8%
mean distinct teams          1.71
```

Read with the selection bias in mind: an alias that split across the Chargers and the
Jaguars does not appear here, because not all ten survived. The true concentration is lower
than 58 percent. The direction is still unambiguous. **The field's dominant multi-entry
behavior is to put every entry on the same team**, which is the same conclusion
`02-objective-function.md` reaches for a risk-neutral player with a negligible share, and
which means the field behaves much more like 5,250 draws than 17,000.

The practical consequence is about variance, not about the mean. `|S|` is a sum over 5,250
lumpy blocks rather than 17,000 independent entries, so its distribution is wider. Since
`1/|S|` is convex, a wider `|S|` raises `E[1/|S|]`, and it raises it most on the branches
where a big block dies. Modeling the field as independent entries understates the payoff to
every strategy and understates it unevenly across candidates.

## Modeling the field's choice

Availability is observed. What has to be modeled is the choice: given an entry's remaining
teams, the week, and the prices, which team does it take?

The natural form is a conditional logit over the available set.

```
Pr(entry e picks t)  =  exp(v_t) / sum over t' available to e of exp(v_t')

v_t = b1 * logit(a_t)
    + b2 * future_value_t
    + b3 * salience_t          (prime time, home, division, public visibility)
    + b4 * day_of_week_t       (the Thursday discount is real and exploitable)
    + b5 * published_advice_t  (PoolGenius, Survivor Grid, VSiN, ESPN, app ordering)
```

This is the principled version of what the dashboard already does. The current model raises
win percentage to the tenth power to capture herding. Exponentiating a probability is a
logit-shaped transform, so the existing heuristic is a conditional logit with `b1` pinned to
a hand-chosen value and everything else folded in. Replacing it with an estimated `b1` costs
nothing and buys a standard error, a held-out score, and the ability to detect that the
field is changing.

Two structural additions.

**Model the alias, not the entry.** An alias with `k` entries draws a portfolio, not `k`
independent picks. A Dirichlet-multinomial over the alias's entries, with one concentration
parameter estimated from the data above, reproduces the observed lumpiness with a single
extra number. This is the device Haugh and Singal use for daily fantasy ownership, and the
problem here has the same shape.

**Model archetypes.** Aliases persist across weeks and across seasons, so each one has a
history: how much chalk it takes, whether it plans a path, whether it ever swings. Cluster
them, and simulate the field as a mixture over archetypes rather than one average player.
A mixture reproduces the tails, and the tails are where `E[1/|S|]` lives.

## Fixing the overfitting

The transcript says the popularity model has a few constants fit to recent weeks and
overfits them. The corpus above makes that unnecessary.

- **Pool across seasons.** 2024, 2025, and 2026 to date, with a week index as a feature
  rather than a separate fit per week. The field's behavior in week 8 of 2024 is evidence
  about week 8 of 2026.
- **Walk forward.** Fit on weeks up to `w`, predict week `w+1`, score, advance. Never fit
  and evaluate on the same week. This is the only honest way to measure the model and it is
  the specific discipline the current constants are missing.
- **Score the thing you care about.** The model's output is a predicted `n_t` vector. Score
  it against the realized `n_t` from the next week's file, with a proper multinomial score,
  and report it every week. A popularity model that has never been scored out of sample is
  a hypothesis, not an input.
- **Watch for drift.** Is the field getting sharper year over year, as the contest grows and
  more tools publish? Measurable from the corpus directly, and if it is drifting, the week
  index and a season effect will say so.

## Empirical model or equilibrium

There is a tempting formal move: treat the field as strategic, compute a symmetric Nash
equilibrium, and best-respond to that. Resist it, for now, for reasons that are empirical
rather than aesthetic.

The field is 5,250 heterogeneous decision-makers, most of whom are visibly not solving a
game. 58 percent of the biggest multi-entry players put ten entries on one team. Three teams
took 79 percent of the field in Week 1. An equilibrium model would predict a spread field,
and the observed field is not spread. Clair and Letscher found the same thing in ESPN pools
and drew the same conclusion: almost every opponent is making one of a small number of bad
picks, which is precisely why expected returns are so far above one.

Equilibrium reasoning earns its place in exactly one regime, the endgame, when the field is
small enough that the remaining entries are sophisticated and may be modeling us as we model
them. That regime is weeks away and should be its own decision record when it arrives.

## Other data worth capturing

- **Published advice, weekly, before the deadline.** PoolGenius, Survivor Grid, VSiN, ESPN,
  4for4, Splash Sports. These are a leading indicator of the field, not a competitor to it.
- **Circa's own app.** The field picks inside the Circa app, so whatever ordering or default
  that app presents is a salience feature with a direct causal channel.
- **The Circa results and elimination posts.** Cross-checks on the availability file and the
  source of the losing side's counts.

## Summary of changes

| Current | Proposed |
|---|---|
| Aggregate popularity typed in from a photo | Fetch and parse the official per-entry file |
| Availability approximated in aggregate | Observed exactly, per entry |
| Constants fit to recent weeks | Conditional logit estimated on 2024-2026, walk-forward scored |
| Field treated as independent entries | Alias as the decision unit, Dirichlet-multinomial within |
| One average player | Mixture over archetypes clustered from history |
| Never scored out of sample | Weekly predicted-versus-realized `n_t` score |
