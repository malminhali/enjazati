# Enjazati website

The Arabic pages are the source for the public portal. Keep each `lang="ar"` and `lang="en"` content pair together. Run `python3 scripts/build-locales.py` from the repository after editing a page. Commit the generated `en/` pages and sitemap along with the source. Main branch updates deploy to GitHub Pages.

The service catalogue contains informational references and official links. The Website folder in Drive contains the 191-entry review workbook and office approval records. Use the workbook IDs when adding references.

The property catalogue reads `assets/portal/properties.json`. Publish only an approved, available property with a verified advertisement licence and genuine images cleared for publication. The public file accepts `approved` and `available` booleans, a `purpose` of `sale` or `rent`, and `type` of `apartment`, `villa`, `house`, `land` or `commercial`. Provide `title`, `location` and `description` as Arabic and English string pairs, `area` in square metres, `licence` as a string, `licenceExpiry` in YYYY-MM-DD format and `photos` as approved local paths under `/assets/properties/`. Keep draft, private and expired data outside the public repository and JSON.

Calculators run entirely in the browser. Update the formula, example, source and verification date when official rates or requirements change.
