# TODO - Auto model recommendation (fastest write model)

task_progress Items:
- [x] Step 1: Inspect existing AI/model selection flow and current provider call path
- [ ] Step 2: Implement benchmark state + selection/metrics logic
- [ ] Step 3: Implement model discovery (best-effort) + benchmarker that tests discovered+configured models
- [ ] Step 4: Implement background worker loop with timeout/overlap protection
- [ ] Step 5: Wire UI: add “Recommended (Fastest)” option in model selector
- [ ] Step 6: Wire UI logic: auto-use recommended model when user hasn’t manually touched selection
- [ ] Step 7: Testing + typecheck
