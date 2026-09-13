# IssueLink

**Connecting Community Reports to Real Solutions.**

IssueLink is a civic-tech issue reporting platform built on the core idea that
**reports ≠ issues** — many residents may report the same real-world problem,
and IssueLink lets administrators link related reports into one consolidated,
trackable **Issue**.

## Running it

No build step, no installation, no server required.

1. Open `index.html` directly in a browser — this is the **Resident Portal**.
2. Open `admin.html` directly in a browser — this is the **Admin Portal**.

Both files run entirely on `localStorage`, so they must be opened from the
same folder/origin to share data (e.g. both as local files, or both hosted
on the same site).

**Demo admin login:** `admin@issuelink.local` / `admin123` (demo only — add
your own admin accounts or change this one from Settings).

## Fresh state

On first load, everything starts empty: 0 reports, 0 issues, 0 confirmations.
No demo data is ever loaded automatically. Use **Admin → Settings → Load Demo
Data** to explore the app with sample records, and **Clear All Local Data**
to reset back to empty at any time.

## Core workflow

```
REPORT → PHOTO EVIDENCE → LINK → CONSOLIDATE → PRIORITIZE → RESOLVE → VERIFY
```

- Residents submit anonymous reports with required photo evidence.
- Admins review reports in the **Linking Center**, which surfaces possible
  matches with an explainable score (location, category, description,
  time proximity) — links are always confirmed manually, never automatic.
- Linked reports consolidate into a single Issue with a computed priority
  score, assignment, timeline, and public status.
- Residents can confirm "this affects me too" and verify resolutions.

## Files

| File | Purpose |
|---|---|
| `index.html` | Resident-facing portal |
| `admin.html` | Admin management console |
| `style.css` | Shared styling for both portals |
| `app.js` | Shared data layer + resident portal logic |
| `admin.js` | Admin portal logic |
| `code.gs` | Optional Google Apps Script bridge (Sheets + Drive sync) |

## Optional Google Sheets / Drive sync

By default IssueLink runs in **Local Only** mode (localStorage). To enable
optional centralized sync:

1. Create a Google Sheet, open **Extensions → Apps Script**, and paste in
   `code.gs`.
2. Deploy it as a **Web App** (Execute as: Me, Access: Anyone).
3. Copy the deployment URL into **Admin → Settings → Data & Sync → Google
   Apps Script Web App URL**, and set Storage Mode to **Google Sheets Sync**.
4. Use **Test Connection** / **Sync Now** as needed.

If the script is unreachable or sync fails, IssueLink automatically keeps
working in Local Only mode — no data is lost.

## Notes

- Built with vanilla HTML/CSS/JS only — no frameworks, no build tools.
- Font Awesome is loaded via CDN for icons; Times New Roman is used
  throughout per design spec.
- Photos are resized/compressed client-side before being stored.
