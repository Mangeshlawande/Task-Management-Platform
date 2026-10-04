/**
 * Client-side rules — deliberately mirror the backend validators
 * (src/validators/index.js) so users get instant feedback that matches the API.
 */

export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const USERNAME_RE = /^[a-z0-9_]+$/; // backend lowercases before matching

export const validateEmail = (email) => {
  if (!email?.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return null;
};

export const validateUsername = (username) => {
  const u = (username || '').trim().toLowerCase();
  if (!u) return 'Username is required';
  if (u.length < 3) return 'Must be at least 3 characters';
  if (u.length > 30) return 'Must be at most 30 characters';
  if (!USERNAME_RE.test(u)) return 'Only letters, numbers and underscores';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Must be at least 8 characters';
  return null;
};
