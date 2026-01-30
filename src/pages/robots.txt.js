const getRobotsTxt = (sitemapURL) => `\
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET = ({ site }) => {
  const sitemapURL = new URL("sitemap.xml", site);
  return new Response(getRobotsTxt(sitemapURL));
};
