import { AuthTokens } from '../types/auth';
import { clearTokens, loadTokens, saveTokens } from '../storage/tokenStorage';

let currentTokens: AuthTokens | null = null;

export async function initializeTokens(): Promise<AuthTokens | null> {
  currentTokens = await loadTokens();
  return currentTokens;
}

export function getTokens(): AuthTokens | null {
  return currentTokens;
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  currentTokens = tokens;
  await saveTokens(tokens);
}

export async function clearTokenState(): Promise<void> {
  currentTokens = null;
  await clearTokens();
}
