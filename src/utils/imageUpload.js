import { supabase, isSupabaseConfigured } from '../services/supabase';
import { db } from '../services/db';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Validates file type (JPG, PNG, WEBP) and size (max 3 MB)
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid image format. Please choose JPG, PNG, or WEBP.',
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file is too large. Maximum allowed size is 3 MB.',
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
        const dataUrl = canvas.toDataURL(outputType, quality);
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
 * - In Supabase mode: sends via 'upload-media' Edge Function (validated by admin session or open event token).
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

  const maxDim = folder === 'events' ? 1280 : 480;

  if (isSupabaseConfigured) {
    onProgress(35);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

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

    if (error) {
      throw new Error(
        error.message?.includes('Failed to send') || error.message?.includes('404')
          ? 'Supabase upload-media Edge Function is not deployed yet. Please deploy supabase/functions/upload-media or select a built-in club image.'
          : error.message || 'Image upload failed.'
      );
    }

    if (!data?.url) {
      throw new Error(data?.error || 'Upload completed without returning an image URL.');
    }

    onProgress(100);
    return data.url;
  } else {
    onProgress(55);
    const compressedUrl = await compressImageToDataUrl(file, maxDim, 0.8);
    onProgress(100);
    return compressedUrl;
  }
}
