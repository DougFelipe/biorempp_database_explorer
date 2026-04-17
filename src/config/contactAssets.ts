import { getClientBasePath, withBasePath } from '../utils/basePath';

const CLIENT_BASE_PATH = getClientBasePath();

export const CONTACT_IMAGE_ASSETS = {
  lbmg_logo: withBasePath('/lbmg_logo.png', CLIENT_BASE_PATH),
  developer: withBasePath('/developer.jpeg', CLIENT_BASE_PATH),
  supervisor: withBasePath('/supervisor.png', CLIENT_BASE_PATH),
} as const;

export type ContactImageKey = keyof typeof CONTACT_IMAGE_ASSETS;

export function resolveContactImage(imageKey: string) {
  const resolved = CONTACT_IMAGE_ASSETS[imageKey as ContactImageKey];
  if (!resolved) {
    throw new Error(`Invalid contact config: unknown image key "${imageKey}"`);
  }
  return resolved;
}
