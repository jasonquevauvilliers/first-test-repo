# Build and install Pong from your phone

GitHub Actions can build the Android app without your Mac. Pull requests run web regression checks, compile the Android app, and run Android lint. Pushes to `main` and manual runs on `main` also upload an installable debug APK after those checks pass. The workflow does not publish to Google Play or run an emulator.

## One-time setup from a mobile browser

Use GitHub in your phone's browser while signed in. Some settings and artifact downloads are easier with the browser's **Desktop site** option.

1. Create the repository Actions secret **PONG_DEBUG_KEYSTORE_BASE64** before merging the workflow pull request. Open **Settings → Secrets and variables → Actions → New repository secret**. Paste the complete base64 text of your dedicated CI debug keystore into the secret value and use that exact name. A prepared key can be supplied privately in the development chat; do not put its text in an issue, pull request, commit, or workflow file.
2. If Actions are disabled, open **Settings → Actions → General** and enable them. Allow the referenced GitHub, Gradle, and Android setup actions. Keep the default workflow token permission **Read repository contents and packages**; this workflow does not need write access or permission to create pull requests.
3. Review the workflow pull request. Wait for **Web regression checks** and **Android build and lint** to pass, then merge. PR checks do not need the signing secret and do not upload an APK for installation.
4. The merge starts a build on `main`. Open **Actions → Pong checks and Android APK**, then open the newest run. Wait for both jobs to turn green. A cold Android build can take several minutes.

The private key makes APK signatures consistent between builds. Keep a secure backup and retain the same secret for future updates. The expected debug keystore alias is `androiddebugkey`, with store/key passwords `android`; these are standard debug defaults. This key is for development builds and must not become your production Play Store signing key.

## Download and install on Android

1. Open a successful `main` run in the Actions tab. Scroll to **Artifacts** and download **pong-android-apk**. GitHub downloads a ZIP; Android needs the `.apk` inside it.
2. Open **My Files → Downloads**, extract the ZIP, and tap the APK. Its filename includes the game version and commit so you can identify the build.
3. If Android prompts for permission, allow the browser or file manager to **Install unknown apps**, then complete installation. On Samsung, Auto Blocker can prevent this installation; temporarily disable it if needed and re-enable it afterward. USB and wireless debugging are not needed to install an APK.
4. Launch **Pong** from your app drawer. Test touch controls, long presses, vibration, and background/resume behavior on the phone. These are not verified by a successful build alone.

The dedicated CI key differs from the key Android Studio used on your Mac. If Android reports **App not installed** or an incompatible signature when you first install the CI APK, uninstall the Mac-installed Pong and try again. Pong has no saved match progress. Later CI builds signed with the same secret can update that installation. If you want Mac builds and CI builds to update each other, configure both to use the same debug key when you next have your Mac; never share its private contents publicly.

## Future builds

Merging app changes into `main` starts another checked APK build. You can also choose **Actions → Pong checks and Android APK → Run workflow**, select **main**, and start it manually. Manual runs on other branches run checks but do not use the private key or upload an installable APK.

Downloads expire after 30 days. Run the workflow again to create a fresh artifact. Uploading an APK artifact does not create a GitHub Release. Keep increasing Android `versionCode` for new game versions as described in the README; the workflow does not change version numbers automatically.

## Other recommended automation

- **Dependabot:** the included configuration proposes weekly npm and GitHub Actions updates. Capacitor packages are grouped so related updates can be reviewed together. It opens pull requests and does not merge them automatically.
- **Require passing checks:** after the first successful PR run, use **Settings → Rules → Rulesets** (or **Branches → Branch protection**, depending on GitHub's interface) to protect `main` and require pull requests plus **Web regression checks** and **Android build and lint**. Keep required approval count at zero if you work alone, so you can merge your own PRs after reviewing them.
- **Failure notifications:** use GitHub's notification settings to enable email/mobile notifications for Actions failures for workflows you start. Notification availability depends on GitHub's account and app settings. You do not need a separate monitoring bot for this project.

## Troubleshooting

- **Missing secret:** add `PONG_DEBUG_KEYSTORE_BASE64`, then rerun the failed job. Its value must be the keystore encoded as base64, not the filename or the password.
- **Signing key cannot be read:** check that the full base64 value was copied and that the decoded keystore has the expected alias and password. Never paste the private value into build logs or public comments.
- **No APK artifact:** check that both jobs passed and that the run was a push/manual run on `main`. Pull request runs intentionally upload only the lint report.
- **Build failed:** open the failing job and expand the red step. Share the error text or log link, with any private values removed.
- **Install blocked:** extract the ZIP, check the install permission for the app opening the APK, and check Samsung Auto Blocker. An incompatible signature requires resolving the key difference described above.

## Creating a debug signing secret later on a Mac

To use the debug key Android Studio already created, encode it and copy it directly to your clipboard:

```sh
base64 < "$HOME/.android/debug.keystore" | tr -d '\n' | pbcopy
```

Paste it into the repository secret. Do not overwrite an established CI key casually: changing the signing key prevents normal updates to installations signed with the old one.
