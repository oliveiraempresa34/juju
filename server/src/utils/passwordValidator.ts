/**
 * Password validation utility with strong security requirements
 */

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'admin', 'admin123', 'drift123'
];

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum length
  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }

  // Maximum length (prevent DoS via bcrypt)
  if (password.length > 72) {
    errors.push('Senha deve ter no máximo 72 caracteres');
  }

  // Must contain lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  // Must contain uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  // Must contain number
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  // Must contain special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
  }

  // Check against common passwords
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => passwordLower.includes(common))) {
    errors.push('Senha muito comum ou fácil de adivinhar. Use uma senha mais complexa');
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Senha não deve conter caracteres repetidos consecutivamente (ex: aaa, 111)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates password with basic requirements (for backward compatibility)
 */
export function validatePasswordBasic(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }

  if (password.length > 72) {
    errors.push('Senha deve ter no máximo 72 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
