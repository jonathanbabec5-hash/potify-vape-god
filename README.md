# Vape God

[Complete repository directory tree](docs/DIRECTORY.md)

**Editable original game client.** Give players a short, repeatable game inside the Greenhouse.

### Setup and usage

Node.js 24 and npm. Run the install command before running the build checks.

```sh
npm ci
npm run dev
```

Finish one free round. Open http://127.0.0.1:5173 in a browser. 

### Developer entry points

The original React component runs the timed round. The server route in the inspected website revision returns HTTP 410 for game rewards and labels the game practice mode. Explore `art/`, `reference/`, `src/` in the full tree.

### Verification

The editable React client compiled and the Start Class button opened a timed round. At the inspected website revision the reward route returns HTTP 410 and describes practice mode.

```sh
node --check reference/game-served.mjs
npm run build
```

### Release scope

Editable website-integrated game source is recovered. The server at the inspected website revision explicitly disables game Seed awards. A separate Replit workspace and any subsequent deployment still need parity checks. Original VapeGod.tsx and reward-route excerpt from the owner-controlled potify-website main commit b40b28683e548a04619f1e018814dd91aec1256d. The older recovered client and original art are retained for comparison.

[Technical whitepaper](docs/WHITEPAPER.md) · [Marketing and sales plan](docs/MARKETING.md) · [Dated developer log](docs/BUILD-LOG.md)

Existing asset and code terms remain applicable. Public access to a recording, illustration, brand or manuscript does not itself grant commercial reuse rights.
