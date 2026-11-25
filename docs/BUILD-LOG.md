# November 25, 2026 · Vape God

**Question.** Give players a short, repeatable game inside the Greenhouse.

**Source and change.** Original VapeGod.tsx and reward-route excerpt from the owner-controlled potify-website main commit b40b28683e548a04619f1e018814dd91aec1256d. The older recovered client and original art are retained for comparison.

**Observed result.** The editable React client compiled and the Start Class button opened a timed round. At the inspected website revision the reward route returns HTTP 410 and describes practice mode.

```sh
node --check reference/game-served.mjs
npm run build
```

**Next acceptance check.** Replay a local round with a demo account state and verify that inspecting the client creates no reward claim.

**Owner and decision.** Chance owns the public release and approves campaign copy. Editable website-integrated game source is recovered. The server at the inspected website revision explicitly disables game Seed awards. A separate Replit workspace and any subsequent deployment still need parity checks.

This dated record describes the developer package. Verify remote commit and tree in the publication receipt before announcing a GitHub release.
