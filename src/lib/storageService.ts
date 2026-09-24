import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Image compression options for optimal performance on mobile networks
 */
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Result of a file upload to Firebase Storage
 */
export interface StorageUploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Validates an image file before compression and upload
 */
export function validateImageFile(file: File, maxSizeBytes: number = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  const isValidType = validTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!isValidType) {
    return { valid: false, error: 'Please select a valid image file (JPG, PNG, or WebP).' };
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `Image file is too large. Maximum size allowed is ${sizeMb}MB.` };
  }

  return { valid: true };
}

/**
 * Validates a PDF file before upload
 */
export function validatePdfFile(file: File, maxSizeBytes: number = 40 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return { valid: false, error: 'Please select a valid PDF document (.pdf).' };
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `PDF file is too large. Maximum size allowed is ${sizeMb}MB.` };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an image in the browser using HTMLCanvas.
 * Ensures fast upload and minimal bandwidth consumption on Nigerian mobile networks.
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<Blob> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  // Don't compress SVGs or animated GIFs
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calculate constrained dimensions while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original file if canvas context unavailable
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback to original file
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a student profile picture to Firebase Cloud Storage.
 * Compresses to 512x512 max, uploads to profilePictures/{cleanUserId}/profile.jpg,
 * and returns the persistent public download URL.
 */
export async function uploadProfilePicture(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<StorageUploadResult> {
  const validation = validateImageFile(file, 6 * 1024 * 1024);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid profile image');
  }

  const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const compressedBlob = await compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
  });

  const timestamp = Date.now();
  const storagePath = `profilePictures/${cleanUserId}/profile_${timestamp}.jpg`;
  const storageRef = ref(storage, storagePath);

  const metadata: UploadMetadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=86400, must-revalidate',
    customMetadata: {
      userId: cleanUserId,
      uploadedAt: new Date().toISOString(),
    },
  };

  if (onProgress) onProgress(30);

  const uploadSnap = await uploadBytes(storageRef, compressedBlob, metadata);
  if (onProgress) onProgress(80);

  const downloadUrl = await getDownloadURL(uploadSnap.ref);
  if (onProgress) onProgress(100);

  return {
    downloadUrl,
    storagePath,
    fileName: `profile_${timestamp}.jpg`,
    fileSize: compressedBlob.size,
    contentType: 'image/jpeg',
  };
}

/**
 * Uploads an image attached to an announcement or deadline to Firebase Cloud Storage.
 */
export async function uploadContentImage(
  file: File,
  category: 'deadlines' | 'announcements' | 'general',
  entityId: string,
  onProgress?: (percent: number) => void
): Promise<StorageUploadResult> {
  const validation = validateImageFile(file, 10 * 1024 * 1024);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid content image');
  }

  const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'shared';
  const compressedBlob = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
  });

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `images/${category}/${cleanEntityId}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  const metadata: UploadMetadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=604800',
    customMetadata: {
      category,
      entityId: cleanEntityId,
      uploadedAt: new Date().toISOString(),
    },
  };

  if (onProgress) onProgress(30);

  const uploadSnap = await uploadBytes(storageRef, compressedBlob, metadata);
  if (onProgress) onProgress(80);

  const downloadUrl = await getDownloadURL(uploadSnap.ref);
  if (onProgress) onProgress(100);

  return {
    downloadUrl,
    storagePath,
    fileName: cleanName,
    fileSize: compressedBlob.size,
    contentType: 'image/jpeg',
  };
}

/**
 * Uploads a PDF course material document to Firebase Cloud Storage.
 */
export async function uploadCourseMaterialPdf(
  file: File,
  courseCode: string,
  onProgress?: (percent: number) => void
): Promise<StorageUploadResult> {
  const validation = validatePdfFile(file, 40 * 1024 * 1024);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid PDF file');
  }

  const cleanCourse = courseCode.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase() || 'GENERAL';
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `courseMaterials/${cleanCourse}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  const metadata: UploadMetadata = {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=2592000',
    customMetadata: {
      courseCode: cleanCourse,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  if (onProgress) onProgress(25);

  const uploadSnap = await uploadBytes(storageRef, file, metadata);
  if (onProgress) onProgress(80);

  const downloadUrl = await getDownloadURL(uploadSnap.ref);
  if (onProgress) onProgress(100);

  return {
    downloadUrl,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    contentType: 'application/pdf',
  };
}

/**
 * Cleans up / deletes an uploaded file from Firebase Storage if a database transaction fails.
 */
export async function deleteStorageFile(storagePathOrUrl: string): Promise<boolean> {
  if (!storagePathOrUrl) return false;

  try {
    let fileRef;
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      fileRef = ref(storage, storagePathOrUrl);
    } else {
      fileRef = ref(storage, storagePathOrUrl);
    }
    await deleteObject(fileRef);
    return true;
  } catch (err) {
    console.warn('Could not delete storage file:', err);
    return false;
  }
}
