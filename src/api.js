export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

export function getProductImageUrl(image) {
  if (image.startsWith("/uploads/")) {
    return `${API_BASE_URL}${image}`;
  }

  return image;
}
