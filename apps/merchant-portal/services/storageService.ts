/**
 * Image storage — Supabase Storage only (Phase D).
 * Bucket: outlet-media (public read). Paths: outlets/{outletId}/...
 */

import { createBrowserSupabaseClient } from "@bookglow/supabase";

const OUTLET_MEDIA_BUCKET = "outlet-media";

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

/**
 * Upload an image file.
 * @param file - The image file to upload
 * @param path - Storage path (e.g., 'outlets/outlet_001/services/id.jpg')
 * @returns Promise resolving to the download URL
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const supabase = createBrowserSupabaseClient(viteEnv());
  const { error } = await supabase.storage.from(OUTLET_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(error.message || "Failed to upload image");
  const { data } = supabase.storage.from(OUTLET_MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("No URL returned from upload");
  return data.publicUrl;
};

/**
 * Delete an image from storage (best-effort / non-blocking on failure).
 * Legacy Firebase Storage URLs are skipped (bucket may still serve them).
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const marker = `/object/public/${OUTLET_MEDIA_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) {
      console.warn("Could not extract Supabase storage path from URL:", imageUrl);
      return;
    }
    const path = decodeURIComponent(imageUrl.slice(idx + marker.length).split("?")[0]);
    const supabase = createBrowserSupabaseClient(viteEnv());
    const { error } = await supabase.storage.from(OUTLET_MEDIA_BUCKET).remove([path]);
    if (error) console.warn("Error deleting Supabase image (non-blocking):", error.message);
  } catch (error: any) {
    console.warn("Error deleting image (non-blocking):", error?.message);
  }
};

export const getServiceImagePath = (outletID: string, serviceId: string, fileName: string): string => {
  const extension = fileName.split(".").pop() || "jpg";
  return `outlets/${outletID}/services/${serviceId}.${extension}`;
};

export const getProductImagePath = (outletID: string, productId: string, fileName: string): string => {
  const extension = fileName.split(".").pop() || "jpg";
  return `outlets/${outletID}/products/${productId}.${extension}`;
};

export const getPackageImagePath = (outletID: string, packageId: string, fileName: string): string => {
  const extension = fileName.split(".").pop() || "jpg";
  return `outlets/${outletID}/packages/${packageId}.${extension}`;
};

export const getStaffProfileImagePath = (outletID: string, staffId: string): string => {
  return `outlets/${outletID}/staff/${staffId}/profile.jpg`;
};
