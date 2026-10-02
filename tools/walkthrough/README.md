# Walkthrough driver

Drives the built app in headless Chrome over CDP with a pinned clock, so a day in the campaign can be walked through on any date without touching a real phone's records. The app has no erase-all, so practise here, not on the phone's install.

## Run

```sh
ng build --configuration development            # production registers the service worker; skip it unless testing offline
ROOT=dist/rangers-road/browser PORT=4311 node tools/walkthrough/serve.mjs &
CHROME=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell
$CHROME --remote-debugging-port=9333 --user-data-dir=/tmp/rr-profile --no-first-run about:blank &
```

Then a script (Node 24, global `WebSocket`):

```js
import { connect } from './tools/walkthrough/lib.mjs';
const b = await connect();          // PIN=2026-10-05T07:00:00 sets the clock; OUT sets the screenshot folder
await b.go('/keep');
await b.clickText('Set Day 1');
console.log(await b.shot('keep', true));   // full-page phone screenshot, path returned
```

Do not use `chrome-headless-shell --screenshot`: IndexedDB open stalls on some launches. The profile keeps its records between runs, so each script re-pins the clock and reloads.

Notes learned on 2026-10-02:
- Port 4300 may already be taken by an old Python server; use another port.
- To wipe the test records: `Page.navigate` to `about:blank`, then `Storage.clearDataForOrigin` with `storageTypes: 'indexeddb,local_storage'`.
- To test a backup restore: `Browser.setDownloadBehavior` to a folder, click "Save a copy", then `DOM.setFileInputFiles` on the file input and click "Replace records".
- To test offline: build for production, load once so the service worker caches, then stop the static server and reload. Page-level offline emulation is not enough.
- Form radios are named `ng.form0.<field>`.
