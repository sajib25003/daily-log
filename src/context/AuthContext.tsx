"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export type UserRole = "superAdmin" | "admin" | "tenant" | "user";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;

  name?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
  };

  photo?: string | null;
};

type CurrentUserResponse = {
  success: boolean;
  message?: string;

  data?: {
    user: AuthUser;
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

/*
 * এটি শুধু API request করবে।
 * এখানে কোনো React state update নেই।
 */
const requestCurrentUser = async (
  signal?: AbortSignal,
): Promise<AuthUser | null> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (response.status === 401) {
    return null;
  }

  const result = (await response
    .json()
    .catch(() => null)) as CurrentUserResponse | null;

  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to load current user.");
  }

  return result?.data?.user ?? null;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  /*
   * Initial value true হওয়ায় useEffect-এর শুরুতে
   * আবার setIsAuthLoading(true) করার দরকার নেই।
   */
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  /*
   * এটি button click বা অন্য event থেকে manually
   * current user reload করার জন্য।
   */
  const refreshUser = useCallback(async () => {
    setIsAuthLoading(true);

    try {
      const currentUser = await requestCurrentUser();

      setUser(currentUser);
    } catch (error) {
      console.error("Current user fetch error:", error);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  /*
   * App প্রথমবার load হলে cookie দিয়ে user পাওয়া হবে।
   *
   * Promise resolve হওয়ার পরে callback থেকে state update হচ্ছে।
   * Effect body-তে synchronous setState হচ্ছে না।
   */
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    requestCurrentUser(controller.signal)
      .then((currentUser) => {
        if (!isMounted) return;

        setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Initial auth check error:", error);

        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        setUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
