// A simple global state store to persist chat sessions across client-side page navigations.
// Because normal client-side Next.js navigations don't refresh the browser,
// variables in this module are preserved. This allows us to keep React Node/JSX elements
// in state without trying to serialize them to localStorage.

export const globalStore: any = {
  analyzeSessions: [],
  analyzeActiveId: null,
  
  errorSessions: [],
  errorActiveId: null,
};
