# Vape God

[Complete repository directory tree](docs/DIRECTORY.md)

**Recovered web client.** Give players a short, repeatable game inside the Greenhouse.

### Setup and usage

Node.js 24 and npm. Run the install command before running the build checks.

```sh
npm ci
npm run dev
```

Finish one free round. Open http://127.0.0.1:5173 in a browser. 

### Developer entry points

The browser client runs the timed round and refers to a separate reward service. Art and the recovered client can be inspected independently of that service. Explore `art/`, `src/` in the full tree.

### Verification

The client compiled with React and Vite. In local Chromium, Start Class opened a timed round with the Hold to Hit control. Reward delivery was outside the test.

```sh
node --check src/game.mjs
npm run build
```

### Release scope

Original editable Replit project and reward server are unavailable. Seeds are non-transferable. potify-vape-god at `73825eeed54131a8abcb0dfec294c5b9cfdf0211`. Recovered first-party portion of the deployed client. Original served bundle SHA-256 40b76880c1cfe94facbcbd007594923fd22a598f191f33956d57849aae715cea. New Vite wrapper has no reward backend. Use a dedicated local origin.

[Technical whitepaper](docs/WHITEPAPER.md) · [Marketing and sales plan](docs/MARKETING.md) · [Dated developer log](docs/BUILD-LOG.md)

Existing asset and code terms remain applicable. Public access to a recording, illustration, brand or manuscript does not itself grant commercial reuse rights.
