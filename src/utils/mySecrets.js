// src/utils/mySecrets.js

const KEY = "my_secrets";

export const getMySecrets = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("getMySecrets() parse error:", e);
    return [];
  }
};

export const addMySecret = (id) => {
  const raw = localStorage.getItem(KEY) || "[]";
  const list = JSON.parse(raw);

  if (!list.includes(id)) {
    const next = [id, ...list];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("my_secrets_updated"));
  }
};


export const removeMySecret = (id) => {
  if (!id) return;
  const mine = getMySecrets().filter((x) => x !== id);
  localStorage.setItem(KEY, JSON.stringify(mine));
  window.dispatchEvent(new Event("my_secrets_updated"));
};


export const hasMySecret = (id) => {
  if (!id) return false;
  return getMySecrets().includes(id);
};

export const clearMySecrets = () => {
  localStorage.removeItem(KEY);
};
