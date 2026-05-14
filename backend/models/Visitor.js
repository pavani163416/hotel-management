import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
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
    duration:    { type: Number, default: 0 },   // seconds, updated on page leave
    status:      { type: String, enum: ["Active", "Bounced", "Converted"], default: "Active" },
    sessionId:   { type: String },               // to group pages per visit
  },
  { timestamps: true }
);

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ ip: 1 });

const Visitor = mongoose.model("Visitor", visitorSchema);
export default Visitor;
