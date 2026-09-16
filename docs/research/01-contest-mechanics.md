# Contest mechanics

Every claim here is taken from the official 2026 rules, revision 6/19/2026, or from Circa's
own published result files. Rule numbers refer to that document. Source URLs are in
`sources.md`. The kickoff transcript states several of these differently, and where it does,
the rules win.

## The payout lattice

This is the part that most changes the math, and it is not what the transcript describes.
Rule 19(d) resolves the contest at the end of every contest week, not only at the end of the
season. Let `A` be the entries alive at the start of a contest week that all submitted a
selection, `S` the subset of them that survives it, and `P` the prize pool.

| Case | Rule | Payout |
|---|---|---|
| `\|S\| >= 2`, weeks remain | 19(d)(i) | none yet, continue |
| `\|S\| = 1` | 19(d)(ii) | that entry takes all of `P` |
| `\|S\| = 0` | 19(d)(iii) | `P / \|A\|` to every entry in `A` |
| `\|S\| >= 2`, no weeks remain | 19(d)(iv) | `P / \|S\|` to each survivor |

So an entry's payout in the resolving week is

```
payout = P / |S|        if it survives
       = P / |A|        if nobody survives
       = 0              otherwise
```

Two consequences the transcript never reaches.

**A total wipeout pays everyone who was alive.** You cannot be left behind by a week that
kills the whole field. This caps the downside of a contrarian swing in exactly the weeks
where a swing is most tempting, and it means the `|S| = 0` branch contributes the same
amount whatever you pick, as long as you picked something.

**Being the last one standing is worth the entire pot, not a share of it.** The step from
two survivors to one is worth `P/2`. Nothing else in the contest has a jump that large.

## The Thanksgiving and Christmas gauntlets

Rule 7 makes the Thanksgiving leg and the Christmas leg their own contest weeks, so there
are 20 picks against 18 NFL weeks. Rules 8 and 9 name the eligible teams in advance.

```
Thanksgiving leg (Nov 25 + 26 + 27), 10 teams:
  GB  LAR  CHI  DET  PHI  DAL  KC  BUF  DEN  PIT

Christmas leg (Dec 24 + 25), 8 teams:
  HOU  PHI  GB  CHI  BUF  DEN  LAR  SEA

overlap, 6 teams:  PHI  GB  CHI  BUF  DEN  LAR
union,   12 teams
```

Rule 8 eliminates an entry that reaches the Thanksgiving leg having already used all ten of
its teams. Rule 9 does the same for Christmas. Together they are a bipartite matching
constraint: an entry needs a system of distinct representatives for the two legs, so by the
Thanksgiving deadline it must hold at least one unused Thanksgiving team, at least one
unused Christmas team, and at least two unused teams in the union of the twelve.

The constraint almost never binds by arithmetic. Eleven picks are made before the
Thanksgiving leg, so twenty-one teams remain. It binds by quality. The twelve teams in the
union are disproportionately the ones a survivor entry wants to spend on a favorable early
matchup. The gauntlet has a shadow price long before it has a
feasibility violation, and that shadow price is the honest definition of future value for
those twelve teams. See `05-future-value-and-constraints.md`.

## Deadlines

| Contest week | Window opens | Deadline (PT) |
|---|---|---|
| Ordinary | Wed 10:00 AM | Sat 4:00 PM |
| Thanksgiving leg | Tue 10:00 AM | Wed Nov 25, 4:00 PM |
| Week after Thanksgiving | Sat Nov 28, 12:00 AM | Sat Nov 28, 4:00 PM |
| Christmas leg | Wed 10:00 AM | Thu Dec 24, 4:00 PM |
| Week after Christmas | Sat Dec 26, 12:00 AM | Sat Dec 26, 4:00 PM |

Three things follow for the pipeline.

The decision input is the Saturday-afternoon line, not the closing line. Every backtest has
to snapshot odds at the deadline, and a backtest that uses closing lines is measuring a
strategy nobody could have run.

Thursday night games have already been played by the Saturday deadline. Their result is
free information about the field, because entries that took the Thursday team are already
resolved. The pick itself has to be locked before the selected team kicks off.

The two weeks that follow the holiday legs have a 16-hour window with no Wednesday-to-Friday
runway. Those two picks want to be planned before the window opens, not inside it.

## Other rules that matter

- **A tie is a loss** (6a). Not a push, not a bye. Roughly one NFL game every year or two
  ends in a tie, and 2025 saw one end a wave of Circa entries.
- **A missed selection is elimination** (12, 13). Operational risk is a real elimination
  mode, not a footnote.
- **A repeat pick disqualifies the entrant** (15a), and Circa explicitly refuses to
  backstop its own software on this. Availability tracking is a correctness requirement,
  not a convenience.
- **Ten entries per person** (3), **entries are independent** (10), and an entrant with
  several winning entries is paid for each (3). Our three entries are three independent
  claims on the pot, not one hedged position.
- **Picks are submitted in Nevada** (15), by the entrant or up to three registered proxies
  (14). Geolocation blocks an out-of-state login from being followed by a proxy submission
  for 30 minutes.
- **Hedging with casino credit is contemplated by the rules** (29), which is as close to an
  endorsement of the endgame hedge as a casino is going to print.

## The field, and what it has done historically

| Season | Entries | Prize | Winners | Per winner |
|---|---|---|---|---|
| 2023 | 9,267 | $9,267,000 | 4 | $2,316,750 |
| 2024 | 14,266 | $14,266,000 | 8 | $1,783,250 |
| 2025 | 18,718 | $18,718,000 | 5 | $3,743,600 |
| 2026 | 25,017 | $25,017,000 | in progress | |

Entries times $1,000 equals the prize in every year. **Circa takes no rake on Survivor.**
The average entry is worth exactly its $1,000 fee, which makes this a zero-vig contest and
makes every unit of edge pure transfer from the rest of the field. It also means the honest
baseline for three entries is $3,000 of expected value against $3,000 of cost, before any
edge at all.

The contest has gone the distance with several survivors in each of the last three seasons,
so 19(d)(ii) has not fired recently. Implied geometric mean field survival per contest week:

```
2023   (4/9267)^(1/20)    = 0.679
2024   (8/14266)^(1/20)   = 0.688
2025   (5/18718)^(1/20)   = 0.663
```

Strikingly stable at roughly two thirds. Carried forward, 25,017 * 0.677^20 is about 10
survivors in 2026, so the modal outcome is a season-ending split near $2.5M per entry, not
a single winner. That number is the denominator every strategic argument runs through, and
it is the first thing to re-estimate each week from the live field.

## 2026 to date

Week 1 killed 8,032 entries of 25,017 (32.1 percent), a field survival rate of 0.679 that
lands exactly on the historical mean. The Chargers lost to the Cardinals and took 7,585
entries with them, 30.3 percent of the field in one game, which Circa's operations VP called
the largest single-pick loss in contest history across its contests.

That is the transcript's thesis playing out in week 1. The Chargers were the highest win
probability and the highest projected popularity, and the pillar that said not to pick them
is the pillar Jamie was least sure of.

The official Week 2 availability file reports 16,978 entries alive. Press reports say
16,985, a discrepancy of seven that is unresolved and probably reflects the file being cut
after Monday night. Use the file.

## Corrections to the kickoff transcript

| Transcript | Rules and record |
|---|---|
| Payout is split among survivors at season end | Four cases, 19(d). A lone survivor takes all, and a total wipeout pays everyone alive |
| Nothing said about total wipeout | 19(d)(iii) pays `P/\|A\|` to the whole live field |
| "Last year there was just a single entry" | 2025 had 5 winners at $3,743,600 |
| "Two years ago there was eight" | 8 winners was 2024. 2023 had 4 |
| "The mode is 10" entries per person | Among surviving 2026 entries the mode is 1 alias with 1 entry. See `04-inputs-field-model.md` |
| Pool availability arrives as a tweeted photo | Circa publishes a machine-readable PDF at a predictable URL, with every entry listed by name. See `04-inputs-field-model.md` |
| Speakers | Speaker A is Jamie, Speaker B is Adam. The auto-summary at the top of the transcript reverses this and attributes Jamie's dashboard and asks to Adam |
