/**
 * Google OAuth 2.0 via Google Identity Services (GSI)
 * Token implícito — sem backend necessário.
 */

import type { GoogleUser } from '../types';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let currentToken: google.accounts.oauth2.TokenResponse | null = null;
let tokenExpiry: number | null = null;

declare global {
  interface Window {
    google: typeof google;
  }
}

export function isGsiLoaded(): boolean {
  return typeof window.google !== 'undefined' && !!window.google?.accounts?.oauth2;
}

export function initTokenClient(
  clientId: string,
  onToken: (token: google.accounts.oauth2.TokenResponse) => void,
  onError: (err: google.accounts.oauth2.ClientConfigError) => void
): void {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      if ((response as unknown as { error?: string }).error) {
        onError(response as unknown as google.accounts.oauth2.ClientConfigError);
        return;
      }
      currentToken = response;
      tokenExpiry = Date.now() + parseInt(response.expires_in) * 1000 - 60_000; // 1 min buffer
      onToken(response);
    },
  });
}

export function requestAccessToken(): void {
  if (!tokenClient) throw new Error('Token client not initialized');
  tokenClient.requestAccessToken({ prompt: '' });
}

export function getAccessToken(): string | null {
  if (!currentToken) return null;
  if (tokenExpiry && Date.now() > tokenExpiry) {
    currentToken = null;
    return null;
  }
  return currentToken.access_token;
}

export function isTokenValid(): boolean {
  return !!getAccessToken();
}

export function revokeToken(): void {
  if (currentToken) {
    window.google.accounts.oauth2.revoke(currentToken.access_token, () => {});
    currentToken = null;
    tokenExpiry = null;
  }
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  const data = await res.json();
  return {
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}
