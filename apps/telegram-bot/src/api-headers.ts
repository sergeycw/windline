export function createApiHeaders(
  apiSecretKey: string | undefined,
  contentType?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (apiSecretKey) {
    headers['X-API-Key'] = apiSecretKey;
  }
  return headers;
}
