import { LinkKey } from '../types';

export const LINK_FIELDS: { key: LinkKey; label: string; placeholder: string }[] = [
  { key: 'github', label: 'GitHub', placeholder: 'github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/name' },
  { key: 'x', label: 'X', placeholder: 'x.com/handle' },
  { key: 'website', label: 'Website', placeholder: 'yoursite.dev' },
  { key: 'stackoverflow', label: 'Stack Overflow', placeholder: 'stackoverflow.com/users/…' },
  { key: 'devto', label: 'dev.to', placeholder: 'dev.to/username' },
  { key: 'medium', label: 'Medium', placeholder: 'medium.com/@name' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@channel' },
  { key: 'hashnode', label: 'Hashnode', placeholder: 'name.hashnode.dev' },
  { key: 'kaggle', label: 'Kaggle', placeholder: 'kaggle.com/name' },
  { key: 'codepen', label: 'CodePen', placeholder: 'codepen.io/name' },
];

/** Photo URL for a user. Versioned so an updated photo is fetched again, not read from cache. */
export function avatarSrc(userId: string, hasAvatar?: boolean, version?: number): string | undefined {
  return hasAvatar ? `/api/users/${userId}/avatar?v=${version || 0}` : undefined;
}

/** Crops an image to a square, scales it to 256px and returns a JPEG data URL small enough to store. */
export function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read.'));
    };
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Your browser cannot prepare the photo.'));
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}
