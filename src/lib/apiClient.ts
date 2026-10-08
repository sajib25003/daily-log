export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

let refreshRequest: Promise<boolean> | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const notifyAuthenticationExpired = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:expired"));
  }
};

const buildApiUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const requestedUrl = new URL(path);
    const apiUrl = new URL(`${API_BASE_URL}/`);

    if (
      requestedUrl.origin !== apiUrl.origin ||
      !requestedUrl.pathname.startsWith(apiUrl.pathname)
    ) {
      throw new Error("External API URLs are not allowed.");
    }

    return requestedUrl.toString();
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
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => {
        if (!response.ok) notifyAuthenticationExpired();
        return response.ok;
      })
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

  const method = (options.method ?? "GET").toUpperCase();

  if (!SAFE_METHODS.has(method) && !headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
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
    notifyAuthenticationExpired();
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
