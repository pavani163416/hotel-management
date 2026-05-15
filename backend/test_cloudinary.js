import "dotenv/config";
import { uploadImage } from "./utils/cloudinary.js";

async function test() {
  try {
    console.log("Testing Cloudinary connection...");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    
    // Upload a small test pixel
    const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const result = await uploadImage(testImage, "test");
    console.log("SUCCESS! Image uploaded to Cloudinary.");
    console.log("URL:", result.url);
  } catch (err) {
    console.error("FAILED! Cloudinary error:", err.message);
  }
}

test();
