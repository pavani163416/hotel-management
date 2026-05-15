import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function test() {
  try {
    console.log("Testing Cloudinary connection...");
    const result = await cloudinary.api.ping();
    console.log("Cloudinary Connection:", result.status === "ok" ? "SUCCESS" : "FAILED");
    
    // Try a test upload
    console.log("Testing dummy upload...");
    const uploadResult = await cloudinary.uploader.upload("https://ui-avatars.com/api/?name=LuxeStay", {
      folder: "test",
    });
    console.log("Upload SUCCESS! URL:", uploadResult.secure_url);
  } catch (err) {
    console.error("Cloudinary Error:", err.message);
  }
}

test();
