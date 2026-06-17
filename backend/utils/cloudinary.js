/**
 * Cloudinary image upload utility
 * Used for hotel and room images
 * Run: cd backend && npm install  (to install cloudinary package)
 */

let _cloudinary = null;

const getCloudinary = async () => {
  if (_cloudinary) return _cloudinary;
  try {
    const { v2 } = await import("cloudinary");
    v2.config({
      cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
      api_key:     process.env.CLOUDINARY_API_KEY,
      api_secret:  process.env.CLOUDINARY_API_SECRET,
    });
    _cloudinary = v2;
    return _cloudinary;
  } catch {
    throw new Error("Cloudinary package not installed. Run: cd backend && npm install");
  }
};

export const uploadImage = async (file, folder = "hotels") => {
  const cloudinary = await getCloudinary();
  const result = await cloudinary.uploader.upload(file, {
    folder:         `athithigriha/${folder}`,
    transformation: [{ width: 1200, height: 800, crop: "fill", quality: "auto", fetch_format: "auto" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    const cloudinary = await getCloudinary();
    await cloudinary.uploader.destroy(publicId);
  } catch {}
};

export default { uploadImage, deleteImage };
