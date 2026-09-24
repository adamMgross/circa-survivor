---
id: cs-unkn
status: closed
deps: []
links: []
created: 2026-09-23T23:29:52Z
type: bug
priority: 1
assignee: Adam Gross
tags: [data]
---
# Schedule a lines pull that lands shortly before every deadline

update-data.yml pulls at 14:17 and 23:17 UTC. The Saturday lock is 4:00 PM PT, which is 23:00 UTC until 2026-11-01, so the evening pull lands 17 minutes after the lock and the last lines seen before each deadline are about nine hours old. The holiday legs lock earlier in the week.

## Acceptance Criteria

For every remaining 2026 leg, including Thanksgiving and Christmas, a scheduled pull lands within the hour before its deadline, checked against the leg deadlines in the rules.

