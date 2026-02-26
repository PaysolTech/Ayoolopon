import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthUser {
  id: string;
  phoneNumber: string;
  displayName: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("ayo_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ayo_user");
    if (!stored) {
      setValidating(false);
      return;
    }
    const parsed = JSON.parse(stored) as AuthUser;
    fetch("/api/auth/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parsed.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem("ayo_user");
          setUser(null);
        } else {
          const data = await res.json();
          const refreshed = { id: data.id, phoneNumber: data.phoneNumber, displayName: data.displayName, token: data.token };
          localStorage.setItem("ayo_user", JSON.stringify(refreshed));
          setUser(refreshed);
        }
      })
      .catch(() => {
        localStorage.removeItem("ayo_user");
        setUser(null);
      })
      .finally(() => setValidating(false));
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("ayo_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ayo_user");
    }
  }, [user]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ayo_user");
  };

  if (validating) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
