# Changelog

## 2.1.0

- Customize the ball with Circle, Heart, Star, and Dog drawings and touch-friendly preview buttons.
- Remember your chosen ball on the device; changing style keeps the current rally and scores.
- All ball styles work offline on Android, the web, and the standalone download, with the same collision physics.
- Android version code 5; retain the verified CI signing key for updates from 2.0.2.

## 2.0.2

- Explicitly sign GitHub APKs with the configured CI key and verify the resulting certificate before upload.
- Fix inconsistent signatures that prevented updating from earlier GitHub builds. Installations from 2.0.0 or 2.0.1 require one uninstall to move to the corrected key.
- Android version code 4; gameplay remains first to 3.

## 2.0.1

- Shorter matches: the first player or computer to score 3 points wins.
- Updated the match instructions and Android version code to 3.

## 2.0.0

- Orange player paddle and purple computer paddle, with a matching dark purple interface.
- Light native Android haptic feedback when the ball hits the player's paddle.
- Keyboard instructions are hidden on touch devices and small screens; pause instructions use touch wording.
- Larger touch buttons and toolbar controls.
- Prevent text selection and context menus when holding game controls.
- Android version code 2; visible version label in the game footer.

## 1.0.0

- Original mint and blue Pong game, with keyboard and touch controls.
- Offline browser download and Capacitor Android packaging.
- First-to-seven matches, pause/resume, restart, and computer opponent.
