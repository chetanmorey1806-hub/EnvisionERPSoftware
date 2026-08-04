export const isValidEmail = (email) => {
  const regEx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regEx.test(email);
};

export const isValidPassword = (password) => {
  // Enforces structural depth: Minimum 8 characters, at least one letter and one digit
  return password && password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
};