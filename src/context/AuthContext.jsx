import { createContext, useContext, useState } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // ================================
  // LOGIN
  // ================================
  const login = async (email, password) => {
    const response = await axiosClient.post("/auth/login", {
      email,
      password,
    });

    const account = response.data.user || response.data;
    const mustResetPassword = Boolean(
      response.data.mustResetPassword ||
      response.data.forcePasswordChange ||
      account.mustResetPassword ||
      account.forcePasswordChange
    );
    const displayName = account.fullName || account.name || email;

    // Save JWT
    sessionStorage.setItem("hms_token", response.data.token);

    // Save logged-in user
    const loggedInUser = {
      email,
      fullName: displayName,
      role: account.role,
      mustResetPassword,
    };
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    return response.data;
  };

  // ================================
  // REGISTER
  // ================================
  const register = async (form) => {
    const response = await axiosClient.post("/auth/register", form);

    return response.data;
  };

  // ================================
  // LOGOUT
  // ================================
  const logout = () => {
    sessionStorage.removeItem("hms_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}