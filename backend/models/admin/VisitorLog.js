import mongoose from "mongoose";

// Stored in: controller database
// Mirror of visitor tracking — admin panel reads from here
const schema = new mongoose.Schema(
  {
    ip:          { type: String, required: true },
    country:     { type: String, default: "Unknown" },
    countryCode: { type: String, default: "XX" },
    city:        { type: String, default: "Unknown" },
    device:      { type: String, enum: ["Desktop", "Mobile", "Tablet"], default: "Desktop" },
    browser:     { type: String, default: "Unknown" },
    os:          { type: String, default: "Unknown" },
    page:        { type: String, required: true },
    referrer:    { type: String, default: "direct" },
    duration:    { type: Number, default: 0 },
    status:      { type: String, enum: ["Active", "Bounced", "Converted"], default: "Active" },
    sessionId:   { type: String },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ ip: 1 });

export default (conn) => conn.model("VisitorLog", schema);
