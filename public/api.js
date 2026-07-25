/**
 * YODIT Backend Integration Layer
 * Use this to connect your frontend to the backend server
 */

(function() {
  const API = window.location.hostname === 'localhost' 
    ? '' 
    : window.location.origin;

  // Storage keys
  const TOKEN_KEY = 'yodit_token';
  const DATA_KEY = 'yodit_data';
  const USER_KEY = 'yodit_user';

  window.YoditAPI = {
    // Auth
    auth: {
      // Register new user
      register: async (name, email, password) => {
        const res = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        return res.json();
      },

      // Login - get verification code
      login: async (email, password) => {
        const res = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        return res.json();
      },

      // Verify code and get JWT token
      verify: async (email, code) => {
        const res = await fetch(`${API=}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
        return data;
      },

      // Resend verification code
      resendCode: async (email) => {
        const res = await fetch(`${API=}/api/auth/resend-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        return res.json();
      },

      // Get current user
      me: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
      },

      // Logout
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      },

      // Check if logged in
      isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),

      // Get token
      getToken: () => localStorage.getItem(TOKEN_KEY),

      // Get user info
      getUser: () => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    },

    // User Data
    data: {
      // Get user data from server
      get: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        const res = await fetch(`${API}/api/user/data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.data;
      },

      // Save user data to server
      save: async (data) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        const res = await fetch(`${API}/api/user/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ data })
        });
        return res.json();
      },

      // Sync data from server (pull latest)
      sync: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        const res = await fetch(`${API}/api/user/sync`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
      }
    },
    utils: {}
  };
})();
