# Pong

A small arcade game built with vanilla HTML, CSS, and JavaScript, with an Android app packaged using Capacitor 8. The web game and standalone download still run without installing packages or building anything. Android development requires Node.js and Android Studio.

Current version: **2.1.0** (Android version code **5**). See [CHANGELOG.md](CHANGELOG.md) for changes from version 1.

To build and download an Android APK without your Mac, see [GitHub Actions setup and phone installation](docs/GITHUB_ACTIONS.md). Pull requests run regression checks and Android compilation/lint; trusted `main` builds also create a downloadable APK after the signing secret is configured.

## Run

**For a download:** download `pong.html` and open it in a modern browser. It includes all styling and game code in one file and works offline.

**For development:** keep `index.html`, `styles.css`, and `game.js` together in the same folder. Open `index.html` in a browser, or serve this directory locally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Stop the server with Ctrl+C.

## Android emulator on a Mac

The checked-in `android/` project wraps the same game in an Android WebView. All game assets are bundled, so the installed app works offline and does not need a web server. Its application ID is `com.pong.game`; it supports Android 7.0 (API 24) and newer and compiles/targets API 36.

### One-time setup

1. Install Node.js **22 or newer** (Node 24 LTS is recommended) and a current [Android Studio for Mac](https://developer.android.com/studio) that supports Android Gradle Plugin **8.13.0**. Complete Android Studio's setup wizard.
2. In Android Studio, open **Tools → SDK Manager** (or **More Actions → SDK Manager** on the welcome screen). Install **Android SDK Platform 36**. Under **SDK Tools**, install **Android SDK Platform-Tools**, **Android SDK Build-Tools** (accept the version Gradle requests), and **Android Emulator**. Accept any SDK license prompts in Android Studio.
3. Open **Tools → Device Manager** (or **More Actions → Virtual Device Manager**). Create a phone such as a Pixel, select an **API 36** system image, download it, and finish. Use **ARM 64 / arm64-v8a** on an Apple Silicon Mac and **x86_64** on an Intel Mac. Start the virtual device with its play button and wait for its home screen.

### Open and run Pong

From the repository root in Terminal:

```sh
npm ci
npm test
npm run android:open
```

`android:open` rebuilds the web assets, syncs them into the native project, and opens the `android/` folder in Android Studio. The native project is already included; **do not run `cap add android` again**.

1. Let Android Studio finish its Gradle sync and any requested SDK downloads.
2. Under **Android Studio → Settings → Build, Execution, Deployment → Build Tools → Gradle**, set **Gradle JDK** to **JDK 21** (the bundled JetBrains Runtime works if it is version 21). The project uses Java 21 and its checked-in Gradle 8.14.3 wrapper; you do not need a separate Gradle installation.
3. Select the **app** run configuration and your running virtual device in the top toolbar, then click **Run ▶**. Android Studio builds, installs, and launches Pong.
4. Click **Start game**, then drag on the court or hold **Move up / Move down** with the emulator mouse. Verify Pause/Resume and Restart. Press the emulator's Home button during a rally, reopen Pong, and verify it is paused until you resume. Try rotating the emulator and playing with Wi-Fi disabled to check layout and offline play.

After every change to `index.html`, `styles.css`, or `game.js`, run this before clicking Run again in Android Studio:

```sh
npm run android:sync
```

Android Studio does not copy web source changes automatically. `android:sync` also refreshes the standalone `pong.html` download. Commit source and native project changes, but not `dist/`, `node_modules/`, copied native assets, SDK paths, or build output.

### Optional Terminal launch

Once the emulator and SDK are set up, you can also run:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
npm run android:run
```

These paths assume the standard Android Studio installation and SDK location; adjust them if yours differ. Check `"$JAVA_HOME/bin/java" -version` reports Java 21. Capacitor prompts for a device if needed. To build a debug APK without launching it, run `npm run android:sync`, then `cd android` and `./gradlew assembleDebug`; the APK is `android/app/build/outputs/apk/debug/app-debug.apk` relative to the repository root.

### Troubleshooting

- **SDK location not found:** open `android/` in Android Studio and select your SDK when prompted. Android Studio writes an untracked `android/local.properties` containing your Mac's SDK path. For Terminal builds, set `ANDROID_HOME` as above.
- **Java or Gradle sync errors:** select JDK 21 for Gradle, use an Android Studio version supporting AGP 8.13.0, and install Platform 36. For Terminal builds, check `JAVA_HOME` too; Android Studio's Gradle JDK setting does not change your shell.
- **Old game or a blank screen:** run `npm run android:sync`, then rebuild and rerun **app**. Do not point Capacitor's `webDir` at the repository root; only `dist/` contains the intended app assets.
- **No device listed:** start the AVD in Device Manager and wait for it to boot. Choose a system image matching your Mac's CPU architecture.
- **First build needs internet:** npm packages, Gradle, SDK components, and Maven dependencies must download once. The installed game itself needs no connection.

If Start does not work, check that JavaScript is enabled and you downloaded `pong.html`, or that all three development files are together. Downloading only `index.html` will not include the game code.

## Play

- Click **Start game**. You control the orange paddle on the left; the computer controls the purple paddle.
- Hold **W / S** or **↑ / ↓** to move up / down.
- On mobile, **drag anywhere on the court** to position the paddle, or hold the large **Move up / Move down** buttons. Releasing or cancelling a touch stops movement. Holding both directions cancels movement until one is released.
- On Android, a light haptic pulse accompanies hits on your paddle. Devices without vibration hardware can still play normally. The browser game works without native haptics.
- Click **Pause** or press **Space** to pause. Click **Resume** or press Space to continue. The game pauses automatically when the window loses focus or the tab is hidden.
- **Restart** immediately starts a new match with both scores at zero.
- First to **3** wins. Click **Play again** for a rematch.
- Use **Choose your ball** to select Circle, Heart, Star, or Dog, even during a rally. Your choice is saved on the device when storage is available. All four styles use the same collision physics and work offline.

Aim with the paddle: hitting near its edge sends the ball at a sharper angle. The ball speeds up with each paddle hit, to a capped maximum. The computer has a limited movement speed so it can be beaten.

## Files

- `index.html`: page, scoreboard, and accessible controls.
- `styles.css`: responsive court layout and visual styling.
- `game.js`: input, fixed-step physics, AI, scoring, and rendering.
- `pong.html`: generated, self-contained version for downloading and offline play.
- `build-standalone.js`: rebuilds `pong.html` from the three source files. After editing those sources, run `node build-standalone.js` (Node.js only; no packages needed).
- `build-web.js`: copies only the three web source assets into the ignored `dist/` directory.
- `capacitor.config.json`: app identity and bundled web asset directory.
- `android/`: native Android Studio project and Gradle wrapper. Generated assets and local machine configuration are ignored.
- `package.json` / `package-lock.json`: pinned Capacitor dependencies and build, test, and Android commands.

## Manual checks

Start a match, try both key pairs, and check that the paddle stays inside the court. Check wall and paddle bounces, and that a missed ball awards the opposing side one point. Pause and verify the ball and paddles freeze, then resume. Restart to clear scores. Play to three to check the winner screen and rematch. Resize the window and test touch controls on a mobile device.

Run the dependency-free regression tests with `node --test tests/game.test.cjs`. They cover collision timing, wall/paddle corner ordering, touch cancellation, multiple fingers, input cleanup, and the standalone download. Mobile browser testing should also check dragging outside the court, releasing outside a button, and switching away from the tab while holding a control.

After `npm ci`, run `npm run build` and `npm test` for the full suite. It also checks hidden-page pause/resume, removes stale build output, runs Capacitor's actual Android sync, and verifies that the native bundle contains the current offline game assets. These tests do not require an Android SDK and do not compile or launch the native app; use the emulator checks above to verify the Android runtime.

Version 2 checks also verify that haptics fire only on player paddle hits, vibration failures do not interrupt play, touch pause instructions omit keyboard shortcuts, and the native Haptics plugin is registered. On a real phone, check the pulse on your paddle hits and hold each movement button for several seconds to confirm that no selection popup appears.

## Updating from version 1

Keep a copy of the version 1 source archive before replacing your project files. For version 2, run `npm ci` and `npm run android:sync`, open `android/` in Android Studio, and click Run with your phone selected. Close the old project first so you run the version 2 project.

The application ID stays `com.pong.game`, so version 2 updates the installed Pong app rather than adding a second icon. Use the same Mac and debug signing key to install over version 1. If Android reports an incompatible signature, uninstall the old app before installing the new one. To return to version 1, uninstall version 2 and build/install the saved version 1 project; Android normally prevents installing a lower version code over a newer one. Pong has no saved match progress to migrate.

For future releases, increase `versionCode` in `android/app/build.gradle`, update `versionName`, `package.json` and the lockfile (with `npm version <version> --no-git-tag-version`), update the footer version in `index.html` and the changelog, then rebuild and test. Archive each release or use Git tags after committing its source so earlier versions remain available. A source ZIP is a development release; it is not a signed Play Store release or a ready-to-install APK.
