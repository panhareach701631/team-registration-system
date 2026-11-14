import { supabase, isSupabaseConfigured } from '../services/supabase';
import { db } from '../services/db';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXT_RE = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (compressed automatically if needed)
const EDGE_UPLOAD_LIMIT_BYTES = 3 * 1024 * 1024; // 3 MB Edge Function limit

/**
 * Validates file type (JPG, PNG, WEBP) and size (max 5 MB)
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  const hasAllowedType = file.type ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : false;
  const hasAllowedExt = ALLOWED_EXT_RE.test(file.name || '');
  if (!hasAllowedType && !hasAllowedExt) {
    return {
      valid: false,
      error: 'Invalid image format. Please choose JPG, PNG, or WEBP.',
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file is too large. Maximum allowed size is 5 MB.',
    };
  }
  return { valid: true };
}

/**
 * Compresses and resizes an image client-side for fast uploads and compact local previews
 */
export function compressImageToDataUrl(file, maxDimension = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        let dataUrl = canvas.toDataURL(outputType, quality);
        // Keep PNG data URLs compact if oversized by encoding as JPEG
        if (outputType === 'image/png' && dataUrl.length > 260000) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode selected image file.'));
      img.src = event.target?.result;
    };
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image securely:
 * - In Supabase mode: tries the 'upload-media' Edge Function first, and seamlessly falls back
 *   to an optimized compressed Data URL if the Edge Function is not deployed yet.
 * - In Local Engine mode: compresses client-side and returns an optimized Data URL.
 */
export async function uploadMediaImage({
  file,
  folder = 'events', // 'events' | 'teams' | 'players'
  registrationToken = '',
  onProgress = () => {},
}) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress(15);

  const normalizedFolder = folder === 'avatars' ? 'players' : folder;
  const maxDim = normalizedFolder === 'events' ? 1024 : 400;

  if (isSupabaseConfigured && file.size <= EDGE_UPLOAD_LIMIT_BYTES) {
    onProgress(35);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', normalizedFolder);

      const headers = {};
      const adminSession = db.getSessionToken();
      if (adminSession) {
        headers['x-admin-session'] = adminSession;
      }
      if (registrationToken) {
        headers['x-registration-token'] = registrationToken;
      }

      onProgress(65);
      const { data, error } = await supabase.functions.invoke('upload-media', {
        body: formData,
        headers,
      });

      if (!error && data?.url) {
        onProgress(100);
        return data.url;
      }

      // Preserve explicit 401 unauthorized errors when the Edge Function IS deployed
      const status = error?.context?.status;
      if (status === 401) {
        throw new Error(data?.error || error?.message || 'Unauthorized image upload request.');
      }
    } catch (err) {
      if (err?.message?.toLowerCase().includes('unauthorized')) {
        throw err;
      }
      // Edge function not deployed / unreachable: fall through to client-side compression fallback
    }
  }

  onProgress(65);
  const compressedUrl = await compressImageToDataUrl(file, maxDim, 0.78);
  onProgress(100);
  return compressedUrl;
}
