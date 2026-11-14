import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { CONSTRAINTS } from '../types/bakery';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Only JPG, PNG, or WebP images are permitted.';
  }
  if (file.size <= 0 || file.size > CONSTRAINTS.MAX_IMAGE_BYTES) {
    return 'Image size must be 5 MB or smaller.';
  }
  return null;
}

export async function uploadImageToStorage(
  file: File,
  folder: 'cakes' | 'custom-requests',
  uid?: string
): Promise<string> {
  const err = validateImageFile(file);
  if (err) {
    throw new Error(err);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath =
    folder === 'custom-requests'
      ? `custom-requests/${uid || 'anonymous'}/${Date.now()}-${safeName}`
      : `cakes/${Date.now()}-${safeName}`;

  const storageRef = ref(storage, storagePath);
  try {
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    return await getDownloadURL(storageRef);
  } catch (uploadErr) {
    const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
    if (msg.includes('storage/unauthorized') || msg.includes('403')) {
      throw new Error(
        'Upload blocked by Storage rules. Ensure you are signed in and Storage rules are deployed.'
      );
    }
    if (msg.includes('storage/bucket-not-found') || msg.includes('404')) {
      throw new Error(
        'Firebase Storage bucket is not activated yet in Firebase Console. Enable Storage in your Firebase Console or paste a valid image URL.'
      );
    }
    throw new Error(`Image upload failed: ${msg}`);
  }
}
