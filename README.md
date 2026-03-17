# Baymax-ray.github.io

Personal academic homepage hosted on GitHub Pages. The site is a customized single-page portfolio based on the [vCard template](https://github.com/codewithsadee/vcard-personal-portfolio), with content for `About`, `Resume`, `Publications`, and `Blog`.

## Current structure

- `index.html`: main page structure and content sections
- `css/style.css`: site styles
- `js/script.js`: sidebar and tab navigation behavior
- `js/bibtex-parser.js`: local BibTeX parser for publications
- `js/publications.js`: loads and renders the publications list
- `assets/data/publications.bib`: publication data source

## Publications workflow

The `Publications` tab reads from:

`assets/data/publications.bib`

Recommended workflow:

1. Export a BibTeX file from Zotero.
2. Replace `assets/data/publications.bib` with the exported file.
3. Commit and push to GitHub Pages, or preview through a local HTTP server.

The page automatically splits entries into:

- `Published`
- `Preprints`

Optional manual override in BibTeX:

```bibtex
keywords = {published}
keywords = {preprint}
```

## Local preview

Do not preview by double-clicking `index.html` with a `file://` URL. Browsers usually block `fetch()` from loading the local `.bib` file in that mode, so the `Publications` section will appear empty.

Use a local server instead. Either of these works:

```powershell
python -m http.server 8000
```

or

```powershell
npx serve .
```

Then open:

`http://localhost:8000`

## Deployment

This repository is intended for GitHub Pages deployment.

1. Push changes to the repository.
2. In GitHub repository settings, enable GitHub Pages for the target branch.
3. Wait for the Pages build to finish.
4. Open the published site URL and verify the `Publications` tab.

## Notes

- `Resume` currently links directly to a PDF in `assets/`.
- The old contact form flow is not part of the active site workflow.
- If publications do not update, first confirm that `assets/data/publications.bib` changed and that the site is being served over `http` or `https`.
