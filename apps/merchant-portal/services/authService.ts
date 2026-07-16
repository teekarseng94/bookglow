/**
 * Firebase Authentication Service
 * 
 * Handles user authentication including login, logout, and password reset
 */

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  AuthError,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Sign in with email and password
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    // Validate email format
    if (!credentials.email || !credentials.email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    // Validate password
    if (!credentials.password || credentials.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email.trim().toLowerCase(),
      credentials.password
    );
    return userCredential.user;
  } catch (error: any) {
    // Log error for debugging
    console.error('Login error:', error);
    
    // Check if it's a Firebase Auth error
    if (error.code) {
      const authError = error as AuthError;
      const errorMessage = getErrorMessage(authError.code);
      
      // Add helpful hints for common errors
      if (authError.code === 'auth/invalid-credential' || 
          authError.code === 'auth/user-not-found' || 
          authError.code === 'auth/wrong-password') {
        throw new Error(`${errorMessage}\n\n💡 Make sure:\n1. User exists in Firebase Console\n2. Email/Password auth is enabled\n3. Credentials are correct`);
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle non-Firebase errors
    if (error.message) {
      throw error;
    }
    
    throw new Error('Login failed. Please check your connection and try again.');
  }
};

/**
 * Sign out current user
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    const authError = error as AuthError;
    throw new Error(getErrorMessage(authError.code));
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    const authError = error as AuthError;
    throw new Error(getErrorMessage(authError.code));
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact administrator.';
    case 'auth/user-not-found':
      return 'No account found with this email address.\n\n💡 Create the user in Firebase Console first:\n1. Go to Firebase Console → Authentication → Users\n2. Click "Add user"\n3. Enter email and password';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is not enabled.\n\n💡 Enable it in Firebase Console:\n1. Go to Authentication → Sign-in method\n2. Enable "Email/Password"\n3. Click Save';
    case 'auth/invalid-credential':
      return 'Invalid email or password.\n\n💡 Troubleshooting:\n1. Verify user exists in Firebase Console\n2. Check Email/Password auth is enabled\n3. Verify credentials are correct';
    case 'auth/invalid-api-key':
      return 'Firebase configuration error. Check your API key.';
    case 'auth/app-not-authorized':
      return 'Firebase app not authorized. Check project configuration.';
    default:
      return `Authentication error: ${errorCode}\n\n💡 Check browser console for details.`;
  }
}
