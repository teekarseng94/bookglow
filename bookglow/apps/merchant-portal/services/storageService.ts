/**
 * Firebase Storage Service
 *
 * Uploads go through a Cloud Function (uploadServiceImage) to avoid CORS.
 * Deletes go through a Cloud Function (deleteStorageFile) when available.
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { app } from '../firebase';

/**
 * Upload an image file via Cloud Function (avoids CORS).
 * @param file - The image file to upload
 * @param path - Storage path (e.g., 'outlets/outlet_001/services/id.jpg')
 * @returns Promise resolving to the download URL
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  try {
    const functions = getFunctions(app, 'asia-southeast1');
    const uploadServiceImage = httpsCallable<{ path: string; base64: string; contentType: string }, { url: string }>(
      functions,
      'uploadServiceImage'
    );

    const base64 = await fileToBase64(file);
    const result: HttpsCallableResult<{ url: string }> = await uploadServiceImage({
      path,
      base64,
      contentType: file.type || 'image/jpeg',
    });

    const data = result.data;
    if (!data?.url) {
      throw new Error('No URL returned from upload');
    }
    return data.url;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(error.message || `Failed to upload image: ${error.message}`);
  }
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (!base64) reject(new Error('Failed to read file'));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Delete an image from Firebase Storage.
 * Uses Cloud Function when available to avoid CORS; falls back to client delete.
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const functions = getFunctions(app, 'asia-southeast1');
    const deleteStorageFile = httpsCallable<{ imageUrl: string }, { ok: boolean }>(functions, 'deleteStorageFile');
    const result = await deleteStorageFile({ imageUrl });
    if (result.data?.ok) return;

    // Fallback: try client-side delete (may fail with CORS)
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    if (!pathMatch || !pathMatch[1]) {
      console.warn('Could not extract path from image URL:', imageUrl);
      return;
    }
    const decodedPath = decodeURIComponent(pathMatch[1].replace(/%2F/g, '/'));
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.warn('Error deleting image (non-blocking):', error.message);
  }
};

/**
 * Generate a storage path for a service image
 * @param outletID - The outlet ID
 * @param serviceId - The service ID
 * @param fileName - Original file name
 * @returns Storage path string
 */
export const getServiceImagePath = (outletID: string, serviceId: string, fileName: string): string => {
  const extension = fileName.split('.').pop() || 'jpg';
  return `outlets/${outletID}/services/${serviceId}.${extension}`;
};

/**
 * Generate a storage path for a product image
 * @param outletID - The outlet ID
 * @param productId - The product ID
 * @param fileName - Original file name
 * @returns Storage path string
 */
export const getProductImagePath = (outletID: string, productId: string, fileName: string): string => {
  const extension = fileName.split('.').pop() || 'jpg';
  return `outlets/${outletID}/products/${productId}.${extension}`;
};

/**
 * Generate a storage path for a package image
 * @param outletID - The outlet ID
 * @param packageId - The package ID
 * @param fileName - Original file name
 * @returns Storage path string
 */
export const getPackageImagePath = (outletID: string, packageId: string, fileName: string): string => {
  const extension = fileName.split('.').pop() || 'jpg';
  return `outlets/${outletID}/packages/${packageId}.${extension}`;
};

/**
 * Storage path for staff profile photo (used in Edit Profile modal).
 * Path: outlets/{outletId}/staff/{staffId}/profile.jpg
 */
export const getStaffProfileImagePath = (outletID: string, staffId: string): string => {
  return `outlets/${outletID}/staff/${staffId}/profile.jpg`;
};
