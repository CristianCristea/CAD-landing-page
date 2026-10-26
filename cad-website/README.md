# CAD Development

A standalone, responsive software development agency website built with HTML, CSS, and vanilla JavaScript. The blue design is the main homepage, with locally hosted Manrope fonts, custom abstract CAD branding, and a professional workspace photograph. No dependencies or build step are required for local preview. Production hosting is planned on Cloudflare, with source code on GitHub and Cloudflare Web Analytics enabled at deployment.

## Positioning

The homepage leads with custom business software, integrations, and practical AI automation. Three primary services cover custom web applications, automation and integrations, and existing software improvements. Business websites and e-commerce appear as a secondary, full-width offering beneath them. Primary services use three columns from 768px upward and stack at 767px and below.

The hero describes business understanding and direct software delivery, without a separate About section or unverified team credentials. The process starts with an initial discussion of goals and priorities. Detailed discovery is included in the project proposal and takes place after agreement, establishing requirements and scope before development. Later stages provide working demonstrations and a tested release with documentation and handover. Post-launch issue-resolution scope and duration are defined in the proposal; ongoing maintenance is agreed separately.

This revision is in English and states that CAD works with clients internationally, in English and German. No language switch is shown until German pages are available; the site does not target a specific industry or geography. Working contact delivery and evidence-backed case studies are deferred, so this content revision does not make the site ready to receive enquiries.

## Preview

Open `index.html` directly in a browser, or serve the folder locally:

```bash
cd /home/cristian/projects/cad-development/cad-website
python3 -m http.server 8080 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8080`. Stop the server with Ctrl+C. The old `blue.html` address redirects to `index.html`, preserving query parameters and section anchors when JavaScript is enabled; a meta refresh and visible link provide a no-JavaScript fallback.

## Edit the website

- `index.html`: content, metadata, navigation, projects, and responsive hero image.
- `legal.html`, `privacy.html`, and `terms.html`: company information, website data processing, and website-use terms. All pages share the stylesheet and navigation script; header and footer HTML is repeated in each page and must be kept consistent.
- `assets/css/blue.css`: the retained blue palette, Manrope typography, and responsive layouts. Mobile navigation and single-column layouts start at 767px and below.
- `assets/js/blue.js`: accessible mobile navigation, the form submission guard, and the copyright year.
- `assets/images/cad-symbol-master.png`: the full-resolution generated abstract brand symbol on a transparent background.
- `assets/images/cad-symbol.png`: optimized 256px symbol used at 44px in the header and footer, paired with a Manrope CAD Development wordmark.
- `favicon.ico`: matching symbol in 16, 32, 48, and 64px sizes. `assets/images/favicon-32.png` is the explicit browser PNG icon; `assets/images/apple-touch-icon.png` is the 180px touch icon. All variants preserve transparency.
- `assets/images/clients/`: the retained Lavina and A-Menu logos.
- `assets/images/hero-workspace-*.webp`: locally hosted hero photograph in 480×600, 800×1000, and 1200×1500 sizes. The image uses a 4:5 aspect ratio, responsive source selection, explicit dimensions, and high-priority eager loading.
- `assets/fonts/`: Manrope fonts and their SIL Open Font License in `Manrope-OFL.txt`.

The homepage sections have stable anchors: `#home`, `#services`, `#work`, `#process`, and `#contact`. The green design, comparison viewer, and entire About section have been removed.

## Legal pages and company information

CAD Development is operated by **DOUBLED VENTURES - FZCO**, a Freezone Company, trade licence **48645**, issued by the **Dubai Integrated Economic Zones Authority**. The listed manager is **Devin Can Tegmen**. The company address is **DSO-IFZA, IFZA Properties, Dubai Silicon Oasis, Dubai, United Arab Emirates**.

These details were transcribed from the supplied licence PDF. The owner confirmed renewal with unchanged company details on 2026-10-26; no current-validity claim or licence dates are published. No tax identifier or email address has been inferred.

The original PDF is preserved at `../company-documents/DOUBLED VENTURES - FZCO -LIC NEW - DIGITAL.pdf`, outside the site deployment directory. Deploy only `cad-website/`; do not include the source document in public build artifacts. Moving it outside this directory does not make it private if it is separately committed to a public repository.

The pages use postal contact details and link to `index.html#contact`, as requested. Website terms do not replace client project agreements. The privacy policy covers the intended Cloudflare production setup; it does not activate analytics or claim that contact-form messages are already being processed.

Sources checked for the privacy wording:

- [UAE Personal Data Protection Law](https://uaelegislation.gov.ae/en/legislations/1972/download).
- [Cloudflare privacy policy](https://www.cloudflare.com/policies/privacy/).
- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) and [data collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/).
- [Cloudflare cookie documentation](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/).

## Cloudflare Workers deployment

Deploy the current static site first, with the contact form disabled. Form delivery and a custom domain are separate follow-up tasks. Workers Static Assets replaces the earlier Pages setup; keep the existing `cad-landing-page` Worker.

**Deployment status:** the owner has created the Worker, but its dashboard reports a disconnected GitHub account. Reconnect GitHub before relying on deployment on push. The production URL and automatic deployment have not yet been verified; record the actual `workers.dev` URL here after the first successful deployment.

The repository-root `wrangler.jsonc` names the existing Worker and sets `assets.directory` to `./cad-website`. This tells Wrangler which directory to publish; there is no Pages-style build output field. No Worker script or application build is needed for this static site.

Use these Workers Builds settings:

| Setting | Value |
| --- | --- |
| Worker name | `cad-landing-page` |
| GitHub repository | `CristianCristea/CAD-landing-page` (private) |
| Production branch | `main` |
| Root directory | `/` (repository root) |
| Build command | None (leave blank) |
| Deploy command | `npx wrangler deploy` |
| Automatic production builds | Enabled |
| Preview builds | Enable non-production branches; use the current Workers preview command offered by the dashboard |

Reconnect the repository under the Worker's Settings → Builds. If authorization is missing, configure the Cloudflare Workers & Pages application in GitHub's installed applications and grant access to this repository. Keep the existing Worker name, which must agree with `wrangler.jsonc`. Use the generated `workers.dev` URL for the initial release. See [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Only the contents of `cad-website/` are published. Keep `assets.directory` unchanged so `company-documents/` and the archived `landing-page/` remain outside the deployed artifact. Cloudflare runs Wrangler as deployment tooling; the website itself still has no runtime dependencies or build step. Cloudflare manages the build's deployment credentials; do not commit tokens to this repository.

Web Analytics is still pending account setup. The earlier Pages-specific one-click injection instructions do not apply to this Worker. Configure the deployed hostname in Cloudflare Web Analytics and follow its installation instructions; for manual installation, use the site's generated beacon snippet on each content page, then redeploy and verify requests. No beacon has been added yet. Worker request metrics are separate from browser-based Web Analytics. See [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

### Push workflow and release checks

1. Check changes locally, including `node --check cad-website/assets/js/blue.js` from the repository root. Commit the intended files and push `main` to `origin`; Cloudflare automatically deploys that commit. With preview builds enabled, other branches create previews rather than replacing production.
2. In the project's Deployments tab, confirm the production deployment succeeds and its commit SHA matches the pushed commit. Check the generated HTTPS URL before treating the release as complete.
3. Verify the homepage, legal pages, relative assets, favicon, section anchors, and the old `blue.html` redirect, including query parameters and fragments. Check mobile and desktop layouts and keyboard navigation. Confirm the form remains disabled and attempting submission generates no requests.
4. Confirm Web Analytics is enabled and the redeployed site loads its beacon. Inspect requests and cookies against the privacy policy and the enabled Cloudflare settings; mentioning analytics in the policy does not enable it.
5. Confirm company documents are absent from the published files. A request to an excluded path must not return the PDF; a fallback HTML response is not evidence that the document was published.

Before enabling form delivery in a later release, select the delivery service and destination inbox, verify receipt, and update the privacy policy to describe the implemented data handling. The business email remains omitted for now.

## Projects

Each project is a self-contained `<article>` preceded by a `PROJECT:` comment. Keep the IDs stable when updating content:

| Project | Anchor | Presentation |
| --- | --- | --- |
| Maine GLB | `#project-maine-glb` | Plain text name |
| VTD | `#project-vtd` | Plain text name |
| A-Menu | `#project-a-menu` | Plain text name |
| Lavina | `#project-lavina` | Plain text name |

Exactly four projects are displayed in the order above, numbered `01 / 04` through `04 / 04`. Each card includes the owner-supplied subtitle, introduction, contribution, result, and service tags. All content is visible without hover or JavaScript. Cards use two columns on desktop and one column below 768px.

All four project cards use consistent text treatments. The A-Menu and Lavina logos were removed from the cards at the owner's request; the asset files are retained. Maine GLB is identified as a private internal system. Only Lavina links to a public project, at `https://lavina.jo/`; the other cards have no links. No screenshots, testimonials, or performance metrics are invented. The section introduction attributes these projects to members of the team; the archived template case-study narratives are not used. No German version currently exists.

## Brand mark

Created on 2026-10-26 with the built-in image-generation tool. The simplified mark is a blue disc with one diagonal notch and a sharply defined navy C inside. The inner C uses clean circular edges instead of soft shading; all favicon variants derive from this corrected master. The website uses the symbol alongside live Manrope text, keeping the company name crisp and accessible. Favicon variants are resized from the same master with ImageMagick. The full generation prompt is in `assets/images/logo-prompt.txt`.

## Header photograph

Photo by **Karl Pawlowicz** on Unsplash: [A computer monitor sitting on top of a wooden desk](https://unsplash.com/photos/a-computer-monitor-sitting-on-top-of-a-wooden-desk-QUHuwyNgSA0).

- Source image: `https://images.unsplash.com/photo-1579403124614-197f69d8187b`
- License: [Unsplash License](https://unsplash.com/license), permitting free commercial use and modification; attribution is appreciated but not required.
- Downloaded on 2026-10-26 using Unsplash image resizing and WebP encoding at quality 85, in the three dimensions listed above. All website image requests are local; there is no runtime hotlink to Unsplash.

## Contact form

The form is intentionally inactive. It has editable Name, Email, Company, and Message fields, a disabled Send button, and an availability note. The disabled button, inline `onsubmit` guard, and JavaScript submission guard prevent normal submission. The form sends and stores no data. The checked-in website code has no submission endpoint, cookies, browser storage, or analytics beacon; Cloudflare may add analytics during deployment as described above.

Contact wiring follows the initial Cloudflare Workers deployment and requires a delivery service and destination inbox. The intended Cloudflare redirect or email-routing behavior will be clarified during that task. The current legal contact uses the supplied postal address; the owner requested leaving the business email out for now. Form delivery remains deferred until a service and destination are provided. The contact section uses one shared heading for its introduction and accessible form label.

## Source archive

`../landing-page/` remains unchanged. The initial agency identity and project names derive from that archive; the current positioning and process copy follow the approved homepage revision. The abstract logo and matching icons are new artwork created for the standalone site. The standalone site does not depend on the archive at runtime.

## Verification

The Workers configuration passed `wrangler 4.153.0 deploy --dry-run` on 2026-10-26, reading 28 files from `cad-website/`. The Worker name, asset directory, homepage presence, and exclusion of PDFs and symlinks were checked, along with JavaScript syntax and Git whitespace. No website HTML, CSS, or JavaScript changed during this configuration update. A dry run does not verify GitHub authorization, analytics, or a live deployment.

Deployment preparation was checked locally on 2026-10-26: JavaScript syntax and Git whitespace checks passed; all 108 local HTML asset/link/fragment references across five HTML files and all CSS asset references resolve. The publish directory contains no PDFs or symlinks. Headless Chrome checks passed on the homepage and three legal pages at 320, 390, 767, 768, 1024, and 1440px, including loaded images, no horizontal overflow, keyboard skip navigation, menu Enter/Escape behavior, section focus, the disabled form with no submission requests or browser storage, the blue-page redirect with query and fragment preservation, and no-JavaScript navigation/content. Mobile and desktop screenshots were reviewed. These checks used local files; HTTPS hosting, injected analytics, and deployment on push still require the Cloudflare project to be connected and verified.

The detailed project cards were checked in headless Chrome on 2026-10-26 at 320, 390, 767, 768, 1024, and 1440px. Checks passed for project order, one/two-column layouts, visible content without JavaScript, loaded logos, heading hierarchy, keyboard Tab/Enter access to Lavina, visible focus, and 45 text-contrast samples. Local links and ARIA references resolve, the JavaScript syntax check passes, and the public Lavina destination was reachable. All homepage HTML outside the work section and all unrelated files were verified unchanged. Mobile and desktop section screenshots were reviewed; other browser engines were not tested. No deployment was performed.

The legal-page addition was checked in headless Chrome on 2026-10-26 across the homepage and all three legal pages at 320, 390, 767, 768, 1024, and 1440px. Checks passed for horizontal overflow, loaded images, unique page metadata, footer legal links, operator attribution, and current-page navigation markers. Mobile cross-page navigation and same-page section focus, Escape, keyboard skip links, no-JavaScript navigation, direct-file links, continuous icon-link hover underlines, and the inactive form passed without runtime or asset-load errors. Desktop and mobile legal-page screenshots were reviewed. All local links and fragment targets resolve; the PDF move preserved its hash, the homepage main content was unchanged, and the source archive was unchanged. These are local Chrome checks, not production hosting or legal-compliance certification.

The revised four-project homepage was verified in headless Chrome on 2026-10-26 at 320, 390, 767, 768, 1024, and 1440px, including high-density image loading: no horizontal overflow, missing loaded assets, or runtime errors. Checks passed for the three-column service layout at 768px and above, stacked services below that breakpoint, and the secondary full-width website offering with its smaller heading. Desktop, tablet, and mobile screenshots were visually reviewed.

Checks also passed for all four project IDs and numbering, project and brand image loading, navigation targets, mobile menu Escape and selection behavior, keyboard skip-link focus, reduced motion, favicon, no-JavaScript navigation, direct-file loading, and the old blue-page redirect (including query and fragment preservation with JavaScript). The contact notice and disabled button remain in place; a submission attempt was canceled and generated no network requests. The page title matches the Open Graph title. Project-card markup and the source archive were verified unchanged. This is a Chrome check, not cross-browser certification.

Run `node --check assets/js/blue.js` for JavaScript syntax. For visual and interaction checks, use phone, tablet, and desktop widths, especially 767px and 768px around the navigation breakpoint. Check all navigation anchors, keyboard focus, mobile menu closing on Escape and link selection, reduced-motion scrolling, readable content and navigation without JavaScript, logo/favicon and responsive image loading, and the inactive contact form. Check both direct-file and HTTP loading, plus the old blue-page redirect.
