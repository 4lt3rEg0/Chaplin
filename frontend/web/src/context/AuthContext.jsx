import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout as clearToken } from "../services/api";

const AuthContext = createContext(null);
const USER_CACHE_KEY = "chaplin_user_cache";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const getCachedProfile = () => {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const setCachedProfile = (profile) => {
    if (!profile) {
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }

    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
    } catch {
      // ignore cache errors
    }
  };

  const mergeRole = (profile) => {
    const role = localStorage.getItem("chaplin_role") || "user";
    return profile ? { ...profile, role } : null;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setAuthError(null);
      setCachedProfile(null);
      setLoading(false);
      return null;
    }

    const cached = getCachedProfile();
    if (cached) {
      setUser(mergeRole(cached));
    }

    try {
      const profile = await getCurrentUser();
      const merged = mergeRole(profile);
      setUser(merged);
      setCachedProfile(profile);
      setAuthError(null);
      return merged;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        clearToken();
        localStorage.removeItem("chaplin_role");
        setCachedProfile(null);
        setUser(null);
        setAuthError("unauthorized");
      } else {
        // Keep cached session visible when backend has transient errors.
        if (!cached) {
          setUser(null);
        }
        setAuthError("backend-unreachable");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOAD ================= */

  useEffect(() => {
    refreshUser();
  }, []);

  /* ================= SAVE ================= */

  useEffect(() => {
    if (user) {
      localStorage.setItem("chaplin_role", user.role || "user");
    }
  }, [user]);

  /* ================= ROLE SWITCH ================= */

  const switchToArtist = () => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            role: "artist"
          }
        : prev
    );
  };

  const switchToUser = () => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            role: "user"
          }
        : prev
    );
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem("chaplin_role");
    setCachedProfile(null);
    setAuthError(null);
    setUser(null);
  };

  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        hasToken,
        refreshUser,
        switchToArtist,
        switchToUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
