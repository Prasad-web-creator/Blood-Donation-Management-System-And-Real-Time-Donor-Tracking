/**
 * Convert Firebase error codes and other errors to user-friendly messages
 */
export const getUserFriendlyMessage = (error: any): string => {
  const message = error?.message || error?.code || String(error);

  // Firebase Auth Errors
  if (message.includes('auth/invalid-credential')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('auth/user-not-found')) {
    return 'Gmail is not registered. Please sign up first.';
  }
  if (message.includes('auth/wrong-password')) {
    return 'Invalid password. Please try again.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'This email is already registered. Please log in instead.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Password is too weak. Use at least 6 characters with a mix of uppercase, lowercase, numbers, and symbols.';
  }
  if (message.includes('auth/operation-not-allowed')) {
    return 'Sign up is currently unavailable. Please try again later.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }

  // Firestore Errors
  if (message.includes('permission-denied')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('not-found')) {
    return 'The requested resource was not found.';
  }
  if (message.includes('unavailable')) {
    return 'Service is currently unavailable. Please try again later.';
  }
  if (message.includes('deadline-exceeded')) {
    return 'Request took too long. Please check your connection and try again.';
  }
  if (message.includes('invalid-argument')) {
    return 'Invalid information provided. Please check your input and try again.';
  }

  // Generic fallback
  if (message && message.length < 100) {
    return message;
  }

  return 'An error occurred. Please try again.';
};

/**
 * Validate form fields before submission
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true };
};
