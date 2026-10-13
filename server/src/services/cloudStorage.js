import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ALLOWED_TYPES, IMAGE_TYPES } from "../config/fileTypes.js";

let configured = false;

function configure() {
  if (configured) return;
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      "File storage is not configured. Add the Cloudinary keys to server/.env",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

// Uploads a file held in memory. Assets are PRIVATE ("authenticated"): no public link exists.
export function uploadBuffer({ buffer, mimeType }) {
  configure();

  const resourceType = IMAGE_TYPES.has(mimeType) ? "image" : "raw";
  // raw files need their extension inside the public_id; images get it from their format
  const ext = resourceType === "raw" ? ALLOWED_TYPES[mimeType] : "";
  const publicId = `geo-shalmani/documents/${new Date().getFullYear()}/${crypto.randomUUID()}${ext}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        type: "authenticated",
        overwrite: false,
      },
      (err, result) => {
        if (err)
          return reject(
            new ApiError(502, `Upload to Cloudinary failed: ${err.message}`),
          );
        resolve({
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format ?? null,
          version: result.version,
        });
      },
    );
    stream.end(buffer);
  });
}

// A signed link to a private file (only generated after our own login + permission check)
export function signedUrl(doc) {
  configure();
  return cloudinary.url(doc.publicId, {
    resource_type: doc.resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
    version: doc.version,
    format: doc.resourceType === "image" ? doc.format : undefined,
  });
}

export async function destroyAsset(doc) {
  configure();
  const res = await cloudinary.uploader.destroy(doc.publicId, {
    resource_type: doc.resourceType,
    type: "authenticated",
    invalidate: true,
  });
  if (!["ok", "not found"].includes(res.result)) {
    throw new ApiError(502, "Could not delete the file from Cloudinary");
  }
}
