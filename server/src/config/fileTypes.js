// Allowed upload types and the extension we keep for non-image files
export const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

// These go to Cloudinary as "image"; everything else goes as "raw"
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
