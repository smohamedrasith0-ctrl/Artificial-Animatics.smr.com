import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
  }
}

testConnection();

// Sanitization helpers aligned strictly with firebase-blueprint.json maxLength bounds
export function clampText(val: string, maxLength: number): string {
  return val.trim().slice(0, maxLength);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeId(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || `item-${Date.now()}`;
}

export interface AuthAttemptResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}

export function interpretFirebaseAuthError(error: unknown): {
  cancelled: boolean;
  message: string;
} {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        cancelled: true,
        message: 'Google sign-in was closed before completion. Click the button again to continue.',
      };
    case 'auth/popup-blocked':
      return {
        cancelled: false,
        message:
          'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
      };
    case 'auth/network-request-failed':
      return {
        cancelled: false,
        message: 'Network error while contacting Google sign-in. Please check your connection.',
      };
    case 'auth/unauthorized-domain':
      return {
        cancelled: false,
        message: 'This domain is not authorized for Google Sign-In.',
      };
    default:
      return {
        cancelled: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to complete Google sign-in. Please try again.',
      };
  }
}

