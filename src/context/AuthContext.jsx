import { createContext, useContext, useState } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    if (!parsedUser) return null;

    return {
      ...parsedUser,
      role: String(parsedUser.role || parsedUser.userRole || parsedUser.accountRole || "PATIENT").toUpperCase(),
    };
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
    const normalizedRole = String(account.role || account.userRole || account.accountRole || "PATIENT").toUpperCase();
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
      id: account.id || account.userId || account.doctorId || null,
      username: account.username || account.userName || "",
      email,
      fullName: displayName,
      role: normalizedRole,
      mustResetPassword,
    };
    sessionStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    return response.data;
  };

  // ================================
  // REGISTER
  // ================================
  const register = async (form) => {
    const normalizedRole = String(form?.role || "PATIENT").toUpperCase();
    const payload = {
      ...form,
      role: normalizedRole,
      userRole: normalizedRole,
      accountRole: normalizedRole,
    };

    const response = await axiosClient.post("/auth/register", payload);

    return response.data;
  };

  // ================================
  // LOGOUT
  // ================================
  const logout = () => {
    sessionStorage.removeItem("hms_token");
    sessionStorage.removeItem("user");
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