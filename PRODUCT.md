# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who saves links: a general-purpose audience, not a specific niche. Typical situation: collecting links around a topic or goal (the shipped templates are Job Search, Travel Plans, Learning Roadmap) and wanting them grouped, findable, and easy to hand to someone else.

## Product Purpose

LinkBoard lets a signed-in user collect links into boards, find them again by search and tags, and share boards. Success: a user can save a link in seconds, find it later, and share a whole board with one action.

## Positioning

Shareable boards. Unlike browser bookmarks, a board can be made public for anyone to browse, copied by other users into their own account, or edited together with collaborators invited by link.

## Operating Context

- Signed-in dashboard: boards grid, board detail view, add/edit link, invite collaborators.
- Public boards page browsable without signing in; copying a board requires sign-in.
- Invite links are single-use and expire after 7 days.
- Used on desktop and phone browsers.

## Capabilities and Constraints

- Stack: React 19 + Vite + Tailwind 4 + DaisyUI client (Vercel); Fastify + Prisma + PostgreSQL API; Firebase Auth (email/password); Cloudinary avatars; Microlink link previews fetched from the browser.
- Data lives in PostgreSQL through the API, not browser storage.
- Links carry title, URL, tags, note, site title, description, preview image, favicon. Per-link colors are being removed (2026-11-24); the `color` column stays but is ignored.
- Limits: 200 links per board, board title 100 characters, 20 tags per link.
- Terminology: "board" (collection), "link", "public board", "collaborator", "invite".
- No new dependencies unless needed.

## Brand Commitments

- Name "LinkBoard" and the existing logo files stay: `client/src/assets/linkboard-mark.svg`, `client/src/assets/linkboardlogo.svg`.
- Color identity comes from the logo mark's palette (indigo #4632E6, blue #3B82F6, sky #68C8F2) in both light and dark mode; backgrounds are tinted, not plain white or black (user request, 2026-11-24).

## Evidence on Hand

- Board templates in `client/src/data/boardTemplates.js`.
- No testimonials, user counts, or press exist; do not invent them.

## Product Principles

1. Sharing is the point: making a board public, copyable, or collaborative should always be one obvious step away.
2. Capture fast, organize later: saving a link must not demand fields the app can fill itself.
3. Your links are the content: the interface stays quiet so favicons, titles, and previews carry the page.
4. Never lose a link: destructive actions are reversible or confirmed, and collaborators never overwrite each other.
