export const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isStrongEnoughPassword = (password) => {
  return typeof password === "string" && password.length >= 8;
};