# Requirements Checklist: Fix Duplicate Daily Digests (Timezone Drift)

**Purpose**: Validate specification quality and completeness for the timezone drift fix
**Created**: 2026-03-17
**Feature**: [spec.md](../spec.md)

## Specification Structure

- [x] CHK001 Feature branch name follows `XXXX-type-description` convention (`002-fix-digest-timezone`)
- [x] CHK002 Status is set to Draft
- [x] CHK003 Input/description is captured accurately
- [x] CHK004 Assumptions section documents all inferred decisions

## User Stories

- [x] CHK005 Each user story has a priority level (P1, P2, P3)
- [x] CHK006 Each user story is independently testable
- [x] CHK007 P1 story directly addresses the reported bug (duplicate digests)
- [x] CHK008 Acceptance scenarios use Given/When/Then format
- [x] CHK009 Each acceptance scenario is specific and verifiable (concrete values, not vague)
- [x] CHK010 Edge cases are identified and documented

## Functional Requirements

- [x] CHK011 Each requirement uses MUST/MUST NOT language
- [x] CHK012 Each requirement is independently testable
- [x] CHK013 FR-001 covers the core fix (recompute next_run on startup)
- [x] CHK014 FR-002/FR-003 cover the data model change (created_tz column)
- [x] CHK015 FR-004/FR-005 specify what should NOT change (interval/once tasks, matching timezones)
- [x] CHK016 FR-006 prevents re-correction on subsequent restarts
- [x] CHK017 FR-007 covers observability (logging corrections)
- [x] CHK018 FR-008 confirms no change to runtime behavior
- [x] CHK019 FR-009 covers new task creation path
- [x] CHK020 No requirement references implementation details (technology-agnostic where possible)

## Key Entities

- [x] CHK021 ScheduledTask extension is documented (created_tz field)
- [x] CHK022 Relationship to TIMEZONE config is documented

## Success Criteria

- [x] CHK023 SC-001 directly maps to the reported bug (no duplicate digest)
- [x] CHK024 SC-002 is measurable (database inspection)
- [x] CHK025 SC-003 is measurable (database inspection for new tasks)
- [x] CHK026 SC-004 has a concrete performance threshold (< 100ms)
- [x] CHK027 SC-005 covers backward compatibility (existing tests pass)

## Completeness

- [x] CHK028 Spec does not modify the constitution
- [x] CHK029 All NEEDS CLARIFICATION markers have been resolved with assumptions
- [x] CHK030 Backward compatibility is addressed (existing tasks, existing tests)
- [x] CHK031 Migration path for existing data is specified (backfill created_tz as UTC)
- [x] CHK032 DST edge case is addressed

## Notes

- All checklist items pass. The specification is complete and ready for planning.
- Zero NEEDS CLARIFICATION markers remain — all ambiguities resolved via assumptions A1-A5.
