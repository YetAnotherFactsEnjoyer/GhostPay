> Historical implementation notes. Current behavior, executed checks, and limitations are documented in [release readiness](../docs/RELEASE-READINESS.md).

# GhostPay light green and emerald redesign

The frontend uses the updated solid palette: #F2F6F3 background, #E5EEE8 sidebar, #FFFFFF primary surfaces, #F2F7F3 controls, and #16764B primary actions. Glass materials, backdrop geometry, gradients, reflections, and blur were removed. Local Inter fonts remain in use.

## Layout and pages

- Overview: compact navigation, two financial summaries in a single surface, a dominant recent-payments table, and a contextual terminal/synchronization rail. The rail moves below the workspace on smaller screens. Accepted volume is grouped by stored currency; processed count excludes conflicts. Material Tailwind chart panels use ApexCharts for a daily accepted-volume line chart and an accepted-payment-count bar chart by terminal. The line chart requires at least two recorded days in the chosen currency; currency and 7/14/30-recorded-day selectors never mix currency totals. Dates are aggregated in UTC using integer minor units. Both charts expose expandable accessible data tables, use solid theme colors, and disable animations. No trends or synthetic metrics are generated. The Material Tailwind card and the ApexCharts core, line, and bar modules load asynchronously.
- Merchants: full-width management table with names, IDs, creation timestamps, terminal links, and the existing native creation dialog.
- Terminals: merchant selection, creation form, and a management table with merchant association, status, and virtual-terminal links.
- Payments: full-width financial table with dates, references, amounts, stored currencies, terminal names, and statuses. Reference/ID search and status filters operate on the selected terminal's real returned records.
- Virtual terminal: large amount, solid numeric keypad, purchase reference, and payment recording in the main column; terminal identity, connectivity, local queue, synchronization, and recent local activity in the second column. Disabled terminals cannot record.
- Synchronization: operational payment queue and saved batch table with explicit conflict/invalid explanations. The contextual column shows actual pending, conflict/invalid, and resolved duplicate counts for the selected terminal, plus retry guidance.
- Authentication: centered light forms with emerald actions and no decorative marketing content.
- Settings: a single organized surface for account, application, and session sections.

Feature-based routing, API clients, JWT handling, IndexedDB schema, queue ownership, stable batch IDs, duplicate/conflict handling, and retry service are retained. `Section` replaces the obsolete `GlassPanel` abstraction. Chart dependencies are @material-tailwind/react, apexcharts, and react-apexcharts, following the Material Tailwind chart integration. No backend endpoints were added. Existing unrelated workspace changes were left in place.

## Verification

- TypeScript and Vite production build: passed.
- ESLint: passed. Generated browser artifacts are excluded from lint traversal.
- Prettier format check: passed.
- Vitest: 3 tests passed.
- Playwright: 15 tests passed using API fixtures and real browser IndexedDB.
- All nine routes checked at 320, 390, 768, 1024, and 1440px, including solid surface assertions and document overflow checks. Wide tables scroll within their own containers.
- Desktop, tablet, and mobile screenshots reviewed for layout, spacing, typography, and alignment. Screenshots are regenerated in the ignored `test-results/` directory.
- Behavioral checks cover merchant and terminal creation, disabled-terminal protection, login/logout, payment searching and status filtering, separate currency totals, conditional historical charts, chart currency/history selectors, chart rendering and accessible data tables at desktop/mobile widths, offline recording, persistence after reload, failed synchronization retries with the same batch ID, and duplicate/conflict results.

## Limits

The original inspiration image was not included in the supplied attachment. The redesign follows the detailed written composition and subsequently selected light green/emerald theme; a direct image comparison was not possible.

The local backend answered unauthenticated requests with HTTP 401. Authenticated browser verification uses isolated API fixtures rather than a live account, so live backend integration is not claimed. Test data is confined to `e2e/` and never appears in production UI.

Initial offline loading is unchanged: there is no service worker. Recording offline after loading the terminal continues to work and is covered by the browser suite.
