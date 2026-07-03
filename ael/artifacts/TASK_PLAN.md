# TASK_PLAN — Fix comprehension-runner.test.ts for P3 LLM re-prompt

## Goal
Update the failing test `comprehension-runner.test.ts:134` to reflect the new P3 behavior where ESCALATION first tries an LLM re-prompt before escalating to a human operator.

## Scope
Single file: `tests/services/comprehension-runner.test.ts`

## Changes Required
1. Add `vi.mock("@/lib/ai/llm-provider")` at top of file to control LLM responses in tests.
2. Split the existing test "returns true and sends escalation message when state is ESCALATION" into two tests:
   - **Test A**: ESCALATION + LLM re-prompt returns `null` → expects escalation (admin notified, "Te transfiero con un operador" sent)
   - **Test B**: ESCALATION + LLM re-prompt returns a message → expects re-prompt response (no admin, re-prompt message sent)
3. Imports and types remain unchanged.

## Priority
P0 — Tests must pass before any other work.

## Dependencies
- `comprehension-runner.ts` P3 change already deployed (the source of the test failure)
- LLM provider mock must be compatible with dynamic `import("@/lib/ai/llm-provider")` in source

## Verification
- `npm test` passes with 53 suites passing, 0 failures
- AEL contracts still pass via `npm run ael:enforce`
