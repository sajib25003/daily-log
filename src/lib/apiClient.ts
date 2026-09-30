export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

let refreshRequest: Promise<boolean> | null = null;

const buildApiUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
};

const requestTokenRefresh = () => {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

export const apiFetch = async (
  path: string,
  options: RequestInit = {},
  retryAfterRefresh = true,
): Promise<Response> => {
  const url = buildApiUrl(path);

  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  const response = await fetch(url, requestOptions);

  const shouldSkipRefresh =
    url.endsWith("/auth/login") ||
    url.endsWith("/auth/logout") ||
    url.endsWith("/auth/refresh-token");

  if (response.status !== 401 || !retryAfterRefresh || shouldSkipRefresh) {
    return response;
  }

  const refreshed = await requestTokenRefresh();

  if (!refreshed) {
    return response;
  }

  /*
   * Refresh সফল হলে original request একবার retry হবে।
   */
  return fetch(url, {
    ...requestOptions,
    headers: new Headers(headers),
  });
};
