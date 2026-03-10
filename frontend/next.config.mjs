/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendOrigin = process.env.BACKEND_ORIGIN || "http://172.16.31.27:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  }
};
export default nextConfig;
