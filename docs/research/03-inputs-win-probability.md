# Input one: win probability

The transcript's position is that consensus live betting lines beat every public model, so
the pipeline should take the market's number and stop. That position is right in spirit and
is implemented in a way that loses a measurable amount of accuracy. Three things need to
change: which market, how the vig comes off, and when the snapshot is taken.

## The claim that the market wins

Widely held and consistent with everything in the market-efficiency literature, and it is
the right prior. What could not be found in this research pass is a clean, current,
head-to-head study scoring de-vigged NFL moneylines against nfelo, ESPN FPI, and the
retired FiveThirtyEight Elo on the same games with a proper scoring rule. Treat it as an
untested assumption of medium confidence rather than a settled fact.

It is cheap to settle ourselves. Archived odds snapshots plus nflverse game results give
Brier score and log loss per source per season, on the same games. That measurement should
exist before the pipeline is built on top of the assumption, and it has a second use: the
same harness scores the de-vig variants below.

## Which market

The current dashboard takes the median of the middle two of the top sportsbooks. Two
problems.

**It aggregates before de-vigging.** Books carry different holds. A median of raw prices is
a median of quantities that are each inflated by a different, unknown amount, so the result
is not a probability and is not even a consistent estimate of one. De-vig each book first,
then aggregate the de-vigged probabilities. The order matters and it is free to fix.

**It does not privilege the sharpest book, or the house.** Two asymmetries argue for
weighting rather than a plain median.

Pinnacle and Circa are the reference books for NFL sides. The consensus is partly composed
of books that copy them with a lag, so a median across the top books double-counts followers
and is stale in exactly the situations where the line is moving for a reason.

Circa is the house for this contest. The field submits picks at Circa kiosks and in the
Circa app, looking at Circa's prices. Circa's line is therefore both a sharp probability
estimate and an input to the field's behavior model in `04-inputs-field-model.md`. It should
be captured separately and stored separately even if it is not the primary probability.

Recommendation: de-vig each book, take Pinnacle and Circa as the primary pair, and use the
wider consensus as an outlier guard and a staleness detector. Store every book's raw price.
The aggregation rule is then a tunable the backtest can score rather than a constant.

## Removing the vig

NFL moneylines are a two-way market. Four methods are in common use.

| Method | Rule | Behavior on heavy favorites |
|---|---|---|
| Multiplicative | divide each implied price by their sum | understates the favorite |
| Additive | subtract half the overround from each | between the other two |
| Power | solve `p1^k + p2^k = 1` | raises the favorite |
| Shin | models a share of informed money | between additive and power |

Worked on a survivor-shaped line, -1000 / +650:

```
raw implied        0.9091 / 0.1333     overround 4.24%
multiplicative     0.8721 / 0.1279
additive           0.8879 / 0.1121
power (k ~ 1.13)   0.8978 / 0.1022
```

**2.6 percentage points of spread on the favorite**, from the same prices. Survivor
candidates are always in this shape, between roughly -250 and -1200, which is precisely the
regime where the method choice is largest. Near pick'em, where most de-vig discussion lives,
the methods agree to within a tenth of a point and none of it matters.

The literature on the favorite-longshot bias says the multiplicative method systematically
understates favorites, and that Shin and power are better calibrated at the extremes.

This looks like it should mostly cancel in the ranking, since every candidate is a favorite,
and to a first approximation it does. It does not cancel in the denominator. The expected
size of the surviving field is `sum_t n_t a_t` summed over the whole slate, and a systematic
one-to-three-point error in every `a_t` moves `|S|` by hundreds of entries early in the
season and by a material fraction late. Since the payout is `P/|S|`, the de-vig method is a
first-order input to the payout even where it is second-order to the ranking. It is not a
detail.

Recommendation: power method as the default, Shin as the alternative, both scored against
held-out outcomes in the same harness as the source comparison. Pick by held-out log loss,
not by argument.

## Spreads as a cross-check, not a source

The moneyline is the probability market and should be the source. The spread is useful as a
consistency check, because a moneyline that disagrees with its own spread signals a stale or
thin price.

Converting a spread to a win probability with a normal distribution, mean at the spread and
standard deviation near 13.5 points, is the standard approximation and is good enough as a
check. It is wrong in a specific way worth knowing: NFL margins pile up on key numbers, with
roughly 14 to 15 percent of games decided by exactly 3 and about 9 percent by exactly 7, so
the normal smooths over exactly the region a 2.5 or 3.5 point spread sits in. An empirical
margin distribution, estimated from historical results and re-centered on the spread, is
strictly better and is not hard. Use it for the check, never as the primary.

## When the snapshot is taken

The deadline is Saturday 4:00 PM PT, so the decision input is the Saturday-afternoon line.
This has consequences the current setup may not honor.

**Backtests must use the deadline snapshot, not the closing line.** A backtest on closing
lines measures a strategy nobody could have executed and will look better than the real
thing. The Odds API sells historical snapshots for featured markets back to mid-2020, which
covers every Circa Survivor season, so there is no reason to approximate this.

**Thursday and Friday results are free information.** By the Saturday deadline, the Thursday
night game has been played and the entries that took a Thursday team are already resolved.
The live field at decision time is smaller and better known than the field at the start of
the week, and the model should condition on the resolved games rather than simulate them.
For the holiday legs this inverts: the Thanksgiving deadline is Wednesday 4:00 PM, ahead of
every game in the leg.

**Archive the snapshot, every week, before deciding.** An input that is not archived cannot
be replayed, and a strategy that cannot be replayed cannot be graded. This is the cheapest
piece of infrastructure in the project and the one whose absence is least recoverable.

## Future weeks

Future value needs win probabilities for weeks that have no lines yet. Look-ahead lines
cover a short horizon and thin out fast, so most of the future has to be modeled. Two
approaches, and the second is better.

**Power ratings from a public source.** What the dashboard does now. It imports somebody
else's model, which contradicts the project's own premise that the market beats models.

**Market-implied power ratings.** The current week's spreads are a system of equations in
team ratings and home-field advantage. Solve it and you have a rating set that reproduces
the market exactly, then generate any future matchup's spread from it, and convert with the
empirical margin distribution. Everything stays anchored to the market, no third-party model
enters the pipeline, and the ratings update every week for free.

**Ratings are not constants.** Projecting week 14 from week 2 ratings pretends nothing will
change. Injuries, quarterback changes, and regression all move ratings, and the variance of
that movement grows with the horizon. Model future ratings as a random walk whose variance
is fit to how much market-implied ratings actually moved week to week in past seasons, and
carry the distribution, not the mean.

That last point has a consequence that is easy to miss. Because we choose later with better
information, an uncertain future is worth more than a certain one at the same mean. A team
whose rating has wide dispersion can be used in the week it happens to look best. Future
value is an option value, and evaluating it at the mean rating systematically undervalues
volatile teams. `05-future-value-and-constraints.md` picks this up.

## Correlation between games

Every formula in `02-objective-function.md` uses the joint distribution of outcomes across
a week's games, not the marginals. If games within a week have a common factor, so that
favorites tend to win or lose together, the distribution of `|S|` is wider than independence
implies, and since the payout is `1/|S|`, a wider distribution is worth more.

Whether this factor exists in the NFL at a size that matters is an open empirical question
and an untested assumption of low confidence. It is directly measurable: take the number of
market favorites that won each week over twenty seasons and compare the dispersion against
the Poisson-binomial implied by the de-vigged lines. If the observed variance exceeds it,
fit a single latent common factor and carry it into the simulation.

## Summary of changes

| Current | Proposed | Why |
|---|---|---|
| median of middle two raw prices | de-vig per book, then aggregate | a median of differently-vigged prices is not a probability |
| unspecified de-vig | power or Shin, chosen by held-out log loss | 2.6 points on a -1000 favorite, and it moves `\|S\|` |
| third-party power ratings | market-implied ratings from current spreads | keeps the market premise intact |
| point estimates for future weeks | rating random walk, carry the distribution | future value is an option value |
| independence across games | measure the common factor, then decide | `1/\|S\|` is convex, so dispersion pays |
| lines at decision time only | archive every snapshot | a strategy that cannot be replayed cannot be graded |
