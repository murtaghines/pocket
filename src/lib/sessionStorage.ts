const REMEMBER_SESSION_KEY = "fint_remember_session";
const AUTH_KEY = "sb-oqngrwevaazcxeotyrdg-auth-token";

export const setRememberPreference = (remember: boolean): void => {
  localStorage.setItem(REMEMBER_SESSION_KEY, JSON.stringify(remember));
};

export const getRememberPreference = (): boolean => {
  const stored = localStorage.getItem(REMEMBER_SESSION_KEY);
  return stored ? JSON.parse(stored) : false;
};

export const transferSessionToSessionStorage = (): void => {
  const sessionData = localStorage.getItem(AUTH_KEY);
  if (sessionData) {
    sessionStorage.setItem(AUTH_KEY, sessionData);
    // IMPORTANT:
    // Do NOT remove the token from localStorage here.
    // The auth client reads the session from localStorage; removing it
    // causes subsequent authenticated requests (like saving preferences)
    // to be sent as anon.
    // We still rely on clearSessionOnUnload() to remove it when the user
    // did not choose "remember me".
  }
};

export const restoreSessionFromSessionStorage = (): void => {
  const sessionStorageToken = sessionStorage.getItem(AUTH_KEY);
  if (sessionStorageToken && !localStorage.getItem(AUTH_KEY)) {
    localStorage.setItem(AUTH_KEY, sessionStorageToken);
  }
};

export const clearSessionOnUnload = (): void => {
  if (!getRememberPreference()) {
    localStorage.removeItem(AUTH_KEY);
  }
};

// Used on explicit logout to ensure no storage-backed session can be restored.
export const clearAuthStorage = (): void => {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
};
