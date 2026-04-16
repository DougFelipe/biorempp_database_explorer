import developerImage from '../../data/assets/developer.jpeg';
import lbmgLogoImage from '../../data/assets/lbmg_logo.png';
import supervisorImage from '../../data/assets/supervisor.png';

export const CONTACT_IMAGE_ASSETS = {
  lbmg_logo: lbmgLogoImage,
  developer: developerImage,
  supervisor: supervisorImage,
} as const;

export type ContactImageKey = keyof typeof CONTACT_IMAGE_ASSETS;

export function resolveContactImage(imageKey: string) {
  const resolved = CONTACT_IMAGE_ASSETS[imageKey as ContactImageKey];
  if (!resolved) {
    throw new Error(`Invalid contact config: unknown image key "${imageKey}"`);
  }
  return resolved;
}
