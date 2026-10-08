"use client";

import { apiFetch } from "@/lib/apiClient";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserRole = "superAdmin" | "owner" | "tenant" | "user";
export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;

  name?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
  };

  phone?: string;
  photo?: string | null;
  provider?: "credentials";
  userStatus?: "active" | "inactive";
  ownerId?: string | null;

  features?: {
    personalCashflow: boolean;
  };
};

type CurrentUserResponse = {
  success: boolean;
  message?: string;

  data?: {
    user?: AuthUser;
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

const requestCurrentUser = async (
  signal?: AbortSignal,
): Promise<AuthUser | null> => {
  /*
   * Access token expired হলে apiFetch:
   * 1. refresh-token call করবে
   * 2. নতুন cookie গ্রহণ করবে
   * 3. /auth/me আবার call করবে
   */
  const response = await apiFetch("/auth/me", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const result = (await response
    .json()
    .catch(() => null)) as CurrentUserResponse | null;

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ??
        `Failed to load current user. Status: ${response.status}`,
    );
  }

  return result?.data?.user ?? null;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

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

  useEffect(() => {
    const clearExpiredAuthentication = () => setUser(null);

    window.addEventListener("auth:expired", clearExpiredAuthentication);

    return () => {
      window.removeEventListener("auth:expired", clearExpiredAuthentication);
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
