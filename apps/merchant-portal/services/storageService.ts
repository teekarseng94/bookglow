/**
 * Image storage — dual provider (Firebase Cloud Functions / Supabase Storage Phase 4).
 *
 * Supabase bucket: outlet-media (public read). Paths: outlets/{outletId}/...
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions";
import { ref, deleteObject } from "firebase/storage";
import { resolveDataProvider } from "@bookglow/shared-types";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { storage } from "../firebase";
import { app } from "../firebase";

const OUTLET_MEDIA_BUCKET = "outlet-media";

function useSupabase(): boolean {
  return (
    resolveDataProvider(
      import.meta.env as unknown as Record<string, string | undefined>
    ) === "supabase"
  );
}

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
  if (useSupabase()) {
    const supabase = createBrowserSupabaseClient(viteEnv());
    const { error } = await supabase.storage.from(OUTLET_MEDIA_BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message || "Failed to upload image");
    const { data } = supabase.storage.from(OUTLET_MEDIA_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("No URL returned from upload");
    return data.publicUrl;
  }

  try {
    const functions = getFunctions(app, "asia-southeast1");
    const uploadServiceImage = httpsCallable<
      { path: string; base64: string; contentType: string },
      { url: string }
    >(functions, "uploadServiceImage");

    const base64 = await fileToBase64(file);
    const result: HttpsCallableResult<{ url: string }> = await uploadServiceImage({
      path,
      base64,
      contentType: file.type || "image/jpeg",
    });

    const data = result.data;
    if (!data?.url) {
      throw new Error("No URL returned from upload");
    }
    return data.url;
  } catch (error: any) {
    console.error("Error uploading image:", error);
    throw new Error(error.message || `Failed to upload image: ${error.message}`);
  }
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      if (!base64) reject(new Error("Failed to read file"));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Delete an image from storage (best-effort / non-blocking on failure).
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  if (useSupabase()) {
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
    return;
  }

  try {
    const functions = getFunctions(app, "asia-southeast1");
    const deleteStorageFile = httpsCallable<{ imageUrl: string }, { ok: boolean }>(
      functions,
      "deleteStorageFile"
    );
    const result = await deleteStorageFile({ imageUrl });
    if (result.data?.ok) return;

    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    if (!pathMatch || !pathMatch[1]) {
      console.warn("Could not extract path from image URL:", imageUrl);
      return;
    }
    const decodedPath = decodeURIComponent(pathMatch[1].replace(/%2F/g, "/"));
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.warn("Error deleting image (non-blocking):", error.message);
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
