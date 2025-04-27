const isPasswordStrong = (password) => {
  // Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
  const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+-\[\]{};':"\\|,.<>\/?]).{8,}$");
  return strongRegex.test(password);
};

module.exports = {
  isPasswordStrong,
};
