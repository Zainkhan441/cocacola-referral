const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Pakistani mobile number, e.g. 03XXXXXXXXX — the account's own contact
// number, independent of any per-deposit sender Easypaisa number.
const MOBILE_NUMBER_PATTERN = /^03\d{9}$/;

export function validateName(name: string): string | null {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "That name looks too short.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validateMobileNumber(value: string): string | null {
  if (!value.trim()) return "Mobile number is required.";
  if (!MOBILE_NUMBER_PATTERN.test(value.trim())) {
    return "Enter an 11-digit mobile number (e.g. 03XXXXXXXXX).";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
