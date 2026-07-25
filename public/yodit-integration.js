/**
 * YODIT Backend Integration
 * Real-time sync, WebSocket, and auth flow
 * Attach this to your frontend HTML
 */

(function() {
  'use strict';

  const API = window.location.hostname === 'localhost' 
    ? '' 
    : window.location.origin;

  // ----------------------------------------
  // UTILITIES
  // ----------------------------------------

  const STORAGE_KEY = 'yodit_data';
  const SYNC_KEY = 'yodit_last_sync';
  const TOKEN_KEY = 'yodit_token';
  const USER_KEY = 'yodit_user';

  function getLocalData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveLocalData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ----------------------------------------
  // API CALLS
  // ----------------------------------------

  async function saveToServer(data) {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${API=}/api/user/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function fetchFromServer() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API}/api/user/sync`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return null;
    }
  }

  // ----------------------------------------
  // PLUGIN ALERS EVENTS
  // ----------------------------------------

  const PluginAlerts = {
    listeners: [],
    on(cb) {
      this.listeners.push(cb);
    },
    emit(event, data) {
      this.listeners.forEach(cb => cb(event, data));
    }
  };

  // WebSocket setup
  let socket = null;

  function connectSocket() {
    if (typeof io === 'undefined') return;
    const token = getToken();
    if (!token) return;

    socket = io(API, { auth: { token } });

    socket.on('connect', () => {
      socket.emit('authenticate', token);
    });

    socket.on('verification_code', (data) => {
      PluginAlerts.emit('verification', data);
    });

    socket.on('account_approved', (data) => {
      PluginAlerts.emit('approved', data);
    });

    socket.on('account_blocked', (data) => {
      PluginAlerts.emit('blocked', data);
    });

    socket.on('new_message', (data) => {
      PluginAlerts.emit('message', data);
    });

    socket.on('disconnect', () => {
      PluginAlerts.emit('disconnect', {});
    });
  }

  // ----------------------------------------
  // AUTO SYNC
  // ----------------------------------------

  let syncInterval = null;

  function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(async () => {
      const localData = getLocalData();

      // Save to server first
      if (Object.keys(localData).length > 0) {
        await saveToServer(localData);
      }

      // Then pull from server
      const serverData = await fetchFromServer();
      if (serverData && serverData.data) {
        const serverVersion = serverData.updatedAt;
        const localVersion = localStorage.getItem(SYNC_KEY);

        if (!localVersion || serverVersion > localVersion) {
          saveLocalData(serverData.data);
          localStorage.setItem(SYNC_KEY, serverVersion);
          PluginAlerts.emit('sync', { data: serverData.data, direction: 'pull' });
        }
      }
    }, 15000); // every 15s 
  }

  // ----------------------------------------
  // SYNC HELPER - call this when your app saves data
  // ----------------------------------------

  function syncNow() {
    const data = getLocalData();
    if (Object.keys(data).length === 0) return;
    saveToServer(data).then(success => {
      if (success) PluginAlerts.emit('sync', { direction: 'push' });
    });
  }

  // ----------------------------------------
  // PUBLIC API
  // ----------------------------------------

  window.YoditIntegration = {
    // Config
    API,

    // Utilities
    getLocalData,
    saveLocalData,
    getToken,
    getUser,
    syncNow,

    // Events
    onAlert: PluginAlerts.on,
    on: PluginAlerts.on,

    // Auth flow
    auth: {
      // Register
      register: async (name, email, password) => {
        const res = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        return await res.json();
      },

      // Login - get verification code
      login: async (email, password) => {
        const res = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        return await res.json();
      },

      // Verify code - get JWT token
      verify: async (email, code) => {
        const res = await fetch(`${API}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          connectSocket();
          startAutoSync();
        }
        return data;
      },

      // Resend code
      resendCode: async (email) => {
        const res = await fetch(`${API}/api/auth/resend-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        return await res.json();
      },

      // Logout
      logout: () => {
        if (syncInterval) clearInterval(syncInterval);
        if (socket) socket.disconnect();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        PluginAlerts.emit('logout', {});
      },

      // Check login status
      isLoggedIn: () => !!getToken()
    },

    // Message check
    checkMessages: async () => {
      const token = getToken();
      if (!token) return [];
      try {
        const res = await fetch(`${API}/api/user/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (e) {
        return [];
      }
    },

    // Init - call once after user is logged in
    init: () => {
      connectSocket();
      startAutoSync();
    }
  };

  // Auto-init if already logged in
  if (getToken()) {
    window.YoditIntegration.init();
  }

})();
