import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function test() {
  try {
    console.log("Testing Cloudinary credentials...");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    // Use a tiny 1x1 base64 pixel to test upload
    const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    
    const result = await cloudinary.uploader.upload(dummyImage, { folder: "athithigriha/test" });
    console.log("Upload Success!");
    console.log("URL:", result.secure_url);
    
    // Clean up
    await cloudinary.uploader.destroy(result.public_id);
    console.log("Cleanup Success!");
  } catch (error) {
    console.error("Cloudinary Error:", error);
  }
}

test();
