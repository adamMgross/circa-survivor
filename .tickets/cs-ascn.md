---
id: cs-ascn
status: closed
deps: [cs-l0oa]
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 1
assignee: Adam Gross
tags: [craft]
---
# Return new rows from computeEV and computeDili instead of mutating the caller's objects

computeEV and computeDili write into the caller's rows, and the board memo adds deltas and flags to the same objects, so a row's shape depends on call order and the previous refresh's rows are mutated too. The exact evaluator replaces computeEV, and it should land on a value-returning signature.

## Acceptance Criteria

No model function assigns to an argument. The parity script from the extraction ticket still passes.


## Notes

**2026-09-24T01:03:32Z**

computeEV and computeDili return { ...info, rows } and boardStats builds deltas and flags as new rows. Parity against e88c1a3: 3648/3648 identical, rendered page byte-identical. test/dili.test.jsx asserts the inputs are untouched.
