import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../api.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "kisan_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.me(token);

        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setToken("");
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // =====================================================
  // LOGIN
  // =====================================================
  // Farmer:
  // login(phone, password, "farmer")
  //
  // Staff:
  // login(staffId, password, "staff")
  // =====================================================

  async function login(
    identifier,
    password,
    userType = "farmer"
  ) {
    setError("");

    let data;

    if (userType === "staff") {
      // STAFF LOGIN
      data = await api.login({
        staffId: identifier,
        password: password,
        userType: "staff",
      });
    } else {
      // FARMER LOGIN
      data = await api.login({
        phone: identifier,
        password: password,
        userType: "farmer",
      });
    }

    // Save token
    localStorage.setItem(
      STORAGE_KEY,
      data.token
    );

    setToken(data.token);
    setUser(data.user);

    return data.user;
  }

  // =====================================================
  // FARMER REGISTRATION
  // =====================================================

  async function register(
    name,
    phone,
    password
  ) {
    setError("");

    const data = await api.register({
      name,
      phone,
      password,
    });

    // Save token
    localStorage.setItem(
      STORAGE_KEY,
      data.token
    );

    setToken(data.token);
    setUser(data.user);

    return data.user;
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  function logout() {
    localStorage.removeItem(STORAGE_KEY);

    setToken("");
    setUser(null);
    setError("");
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        error,
        setError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// useAuth HOOK
// =====================================================

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return ctx;
}