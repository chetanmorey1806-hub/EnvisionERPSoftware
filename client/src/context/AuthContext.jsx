import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

// ---------------------------------------------------------------------------
// Auth response normalizers
// Different endpoints/backends wrap the identity differently: /auth/login often
// returns `{ token, user }`, while /auth/me may return the user object directly,
// or nested as `{ data: { user } }`. Reading a single hard-coded path (e.g.
// `response.data.user`) makes the lookup miss on any other shape, which clears
// the token and logs the user out on refresh. These helpers resolve the user
// and token from whatever reasonable envelope the API uses.
const looksLikeUser = (obj) =>
  !!obj && typeof obj === 'object' && (obj.id || obj._id || obj.email || obj.name || obj.role);

const extractUser = (body) => {
  if (!body) return null;
  if (looksLikeUser(body.user)) return body.user;             // { user: {...} }
  if (looksLikeUser(body.data?.user)) return body.data.user;  // { data: { user: {...} } }
  if (looksLikeUser(body.data)) return body.data;             // { data: {...user fields} }
  if (looksLikeUser(body)) return body;                       // user returned directly
  return null;
};

const extractToken = (body) =>
  body?.token ||
  body?.accessToken ||
  body?.data?.token ||
  body?.data?.accessToken ||
  null;

// Initialize context with a blank structure for clean fallback autocompletes
export const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  updateUserProfile: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Structural Identity Verification Process
  const initializeAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Validate existing token against auth handshake endpoint
      const response = await authApi.getMe();
      const verifiedUser = extractUser(response?.data);
      if (verifiedUser) {
        setUser(verifiedUser);
      } else {
        throw new Error('Malformed user state profile response.');
      }
    } catch (error) {
      console.error('[Auth Initialization Error]:', error.message);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run validation on application boot window mounts
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 2. Authentication Login Action
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authApi.login(credentials);
      const token = extractToken(response?.data);
      const userData = extractUser(response?.data);

      if (!token || !userData) {
        throw new Error('Login response did not contain a valid token and user.');
      }

      localStorage.setItem('token', token);
      setUser(userData);
      return userData;
    } catch (error) {
      setUser(null);
      throw error; // Bubble up execution errors directly to the form UI components
    } finally {
      setLoading(false);
    }
  };

  // 3. System Session Termination Action
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    // Hard refresh clear options to flush layout scopes entirely
    window.location.href = '/login';
  }, []);

  // 3b. Adopt a session issued by another flow (e.g. OTP verification).
  const applySession = useCallback((token, userData) => {
    if (!token || !userData) return;
    localStorage.setItem('token', token);
    setUser(userData);
  }, []);

  // 4. Runtime Profile Hydration (Utility update for settings modules)
  const updateUserProfile = useCallback((updatedUserData) => {
    setUser((prevUser) => (prevUser ? { ...prevUser, ...updatedUserData } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        applySession,
        updateUserProfile
      }}
    >
      {/* Block initial component renders entirely while calculating system handshakes */}
      {!loading ? children : (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400 text-sm font-medium tracking-wide">Securing Workplace Environment...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};