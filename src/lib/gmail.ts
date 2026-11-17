import { Auth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { interpretFirebaseAuthError } from './firebase';

// Strict in-memory token cache (never stored in localStorage or sessionStorage)
let cachedGmailAccessToken: string | null = null;

export function setGmailAccessToken(token: string | null): void {
  cachedGmailAccessToken = token;
}

export function getGmailAccessToken(): string | null {
  return cachedGmailAccessToken;
}

export async function acquireGmailAccessToken(
  auth: Auth,
  provider: GoogleAuthProvider
): Promise<string> {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Gmail send authorization token from Google.');
    }
    cachedGmailAccessToken = credential.accessToken;
    return cachedGmailAccessToken;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const parsed = interpretFirebaseAuthError(error);
      throw new Error(parsed.message);
    }
    throw error instanceof Error
      ? error
      : new Error('Unable to authorize Gmail sending with Google.');
  }
}

function toBase64(input: string): string {
  const utf8Bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

function encodeBase64Url(input: string): string {
  return toBase64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface SendAdminAccessEmailParams {
  accessToken: string;
  recipientEmail: string;
  portalUrl: string;
  roleLabel: string;
  grantedBy: string;
  isTransfer?: boolean;
}

export async function sendAdminPortalAccessEmail({
  accessToken,
  recipientEmail,
  portalUrl,
  roleLabel,
  grantedBy,
  isTransfer = false,
}: SendAdminAccessEmailParams): Promise<void> {
  const subject = isTransfer
    ? 'Artificial Animatics — Primary Admin Control Access Transferred to You'
    : 'Artificial Animatics — Admin Control Portal Access Link';

  const safeRecipient = escapeHtml(recipientEmail);
  const safeRole = escapeHtml(roleLabel);
  const safeUrl = escapeHtml(portalUrl);
  const safeGrantedBy = escapeHtml(grantedBy);

  const htmlBody = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#05070d;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
    <div style="max-width:560px;margin:0 auto;background-color:#0b101d;border:1px solid #1e293b;border-radius:16px;padding:32px;">
      <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#22d3ee;font-weight:bold;">
        ARTIFICIAL ANIMATICS · SECURITY SYSTEM
      </p>
      <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#ffffff;">
        ${isTransfer ? 'Admin Control Ownership Transferred' : 'Admin Control Portal Access'}
      </h1>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Your Google account (<strong style="color:#ffffff;">${safeRecipient}</strong>) is authorized with
        <strong style="color:#22d3ee;">${safeRole}</strong> access to the Artificial Animatics Admin Control Portal.
      </p>
      <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:#94a3b8;">
        Updated by: ${safeGrantedBy}
      </p>
      <div style="margin:0 0 24px 0;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:linear-gradient(90deg,#2563eb,#7c3aed,#f97316);color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
          Open Admin Control Portal
        </a>
      </div>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
        Click the button above and sign in with <strong style="color:#cbd5e1;">${safeRecipient}</strong> when prompted. Keep this email private.
      </p>
    </div>
  </body>
</html>`;

  const encodedBody = toBase64(htmlBody).replace(/(.{76})/g, '$1\r\n');

  const rawMime = [
    `To: ${recipientEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodeBase64Url(rawMime),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || res.status === 403) {
      cachedGmailAccessToken = null;
      throw new Error('Gmail authorization expired or missing permission. Please re-authenticate with Google.');
    }
    throw new Error(`Gmail API error (${res.status}): ${errText}`);
  }
}
