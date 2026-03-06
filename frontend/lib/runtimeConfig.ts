export const runtimeConfig = {
  apiBasePath: "/api"
};

export function resolveApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${runtimeConfig.apiBasePath}${normalizedPath}`;
}
