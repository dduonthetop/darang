# Cloudflare Admin API

This Worker provides shared FAQ persistence for the GitHub Pages site.

## What it does

- Authenticates admins by employee ID
- Stores shared FAQ data in D1
- Returns public FAQ data for the static chatbot
- Lets authenticated admins update FAQ content for everyone

## Setup

1. Install dependencies:
   `npm install`
2. Create a D1 database:
   `npx wrangler d1 create ipark-faq-admin-db`
3. Put the returned `database_id` into `wrangler.toml`
4. Deploy:
   `npx wrangler deploy`
5. Put the Worker URL into:
   [site_config.js](/c:/chatbotpj/darang_bundle_latest/site_config.js)

Example:

```js
window.SITE_CONFIG = window.SITE_CONFIG || {
  adminLoginUrl: "",
  adminApiBase: "https://ipark-faq-admin-api.YOUR_SUBDOMAIN.workers.dev",
};
```

## Notes

- On first request, the Worker seeds D1 from bundled employee IDs and FAQ data.
- GitHub Pages stays static; shared persistence happens through this API.
