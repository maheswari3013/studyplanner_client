export const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  return regex.test(password);
};

export const getPasswordError = (password) => {
  if (password.length < 6) return 'Min 6 characters';
  if (!/[a-z]/.test(password)) return 'Need lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Need uppercase letter';
  if (!/\d/.test(password)) return 'Need number';
  if (!/[@$!%*?&]/.test(password)) return 'Need symbol @$!%*?&';
  return '';
};