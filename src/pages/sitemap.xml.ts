const routes = [
  "/",
  "/proof/",
  "/industry/",
  "/startups/",
  "/programs/",
  "/programs/spark/",
  "/programs/champ/",
  "/network/",
  "/about/",
  "/contact/"
];

export function GET({ site }: { site?: URL }) {
  const origin = site ?? new URL("http://localhost:4321");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) => `  <url><loc>${new URL(route, origin)}</loc></url>`),
    "</urlset>"
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
