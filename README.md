# Thoth — Phase 1 (English, on-device, iPhone 13)

Speak-aloud articulation practice. This scaffold covers the full Phase 1 loop:
onboarding → today's reading → record → on-device analysis → score → streak.

## Setup

### Just exploring the UI (Expo Go, free, no build, no Mac)

```bash
npm install
npx expo start
```

Scan the QR with the Expo Go app on your iPhone. The speech recognition
service auto-detects Expo Go and swaps in a mock recorder — you'll get a
realistic fake transcript (with a couple of built-in fillers/pauses) so the
full loop (record → score → results → streak) is explorable with zero native
build. This is the fastest way to sanity-check the design and flow.

### Real on-device speech recognition (requires a native build, but not a Mac)

EAS builds run on Expo's cloud servers, so this works from Windows/Linux —
you do **not** need a Mac. You do need a **paid Apple Developer account
($99/year)**, since Apple requires it for code-signing anything that installs
on a physical iPhone, regardless of which OS you build from.

```bash
npm install -g eas-cli
eas login                # free Expo account
eas device:create        # registers your iPhone's UDID — open the link it gives you on your iPhone
eas build --profile development --platform ios
```

When the build finishes, EAS gives you an install link/QR to put the dev
client directly on your phone. Then:

```bash
npx expo start --dev-client
```

Open the installed dev client on your iPhone and scan the QR — this build
has the real `expo-speech-recognition` module active, not the mock.


## Before you build on this: verify the speech recognition package

`src/services/speechRecognition.ts` is written against the `expo-speech-recognition`
community package's expected API (start/stop, `result` event, segments with
timestamp/confidence). Native module APIs move fast — before relying on this:

1. Check the package's current README for its exact exports and event shape.
2. **Test whether it transcribes filler words literally.** Record yourself
   saying "um" and "uh" deliberately and inspect the output — Apple's on-device
   recognizer is dictation-tuned and may clean these up rather than transcribe
   them verbatim. If so, the filler-count metric in `scoring.ts` will
   undercount, and you'll want a secondary signal (e.g. treating unusually
   long segment gaps as a proxy) until Phase 2's Whisper swap.
3. Confirm `requiresOnDeviceRecognition: true` is actually honored on iOS 13+
   for English — this is what keeps everything free and offline.

## What's real vs. placeholder in this scaffold

- **Real and functional**: scoring engine (`scoring.ts`), storage/streak logic
  (`storage.ts`), all screens and components, navigation, data model, theme.
- **Needs your verification**: the exact `expo-speech-recognition` API surface
  (see above) — this is the one part of the codebase written against a fast-moving
  external package rather than something we control end to end.
- **Placeholder**: topic images (Picsum), avatar (pravatar) — swap for real
  assets whenever.

## Architecture notes for later phases

- The scoring engine (`scoring.ts`) only depends on the `Transcript` shape in
  `types/index.ts` — `{ text, words: [{ word, startMs, endMs, confidence }] }`.
  Phase 2's swap to a local faster-whisper server should only touch
  `speechRecognition.ts`; nothing in `scoring.ts` or the screens needs to change.
- Filler-word list in `scoring.ts` is English-only by design — Phase 2 adds a
  sibling list per language track (MSA, Egyptian colloquial), not an extension
  of this one.
- `Session.languageTrack` is already on the data model even though only `"en"`
  is used right now, so per-track progress views in Phase 2 are a filter, not
  a schema change.
