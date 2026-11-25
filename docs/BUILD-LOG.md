# November 25, 2026 · Vape God

**Question.** Give players a short, repeatable game inside the Greenhouse.

**Source and change.** potify-vape-god at `73825eeed54131a8abcb0dfec294c5b9cfdf0211`. Recovered first-party portion of the deployed client. Original served bundle SHA-256 40b76880c1cfe94facbcbd007594923fd22a598f191f33956d57849aae715cea. New Vite wrapper has no reward backend. Use a dedicated local origin.

**Observed result.** The client compiled with React and Vite. In local Chromium, Start Class opened a timed round with the Hold to Hit control. Reward delivery was outside the test.

```sh
node --check src/game.mjs
npm run build
```

**Next acceptance check.** Replay a local round with a demo account state and verify that inspecting the client creates no reward claim.

**Owner and decision.** Chance owns the public release and approves campaign copy. Original editable Replit project and reward server are unavailable. Seeds are non-transferable.

This dated record describes the developer package. Verify remote commit and tree in the publication receipt before announcing a GitHub release.
