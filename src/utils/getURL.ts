export const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Main Domain
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Deployment URL
    'http://localhost:3000/';
  // Make sure to include https:// and remove trailing slash
  url = url.includes('http') ? url : `https://${url}`;
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};
