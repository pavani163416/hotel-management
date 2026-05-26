import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true }
}, { _id: false });

const publicSupportRequestSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    hotelName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    issueType: {
      type: String,
      enum: [
        "Login Problem",
        "Forgot Password",
        "Technical Issue",
        "Billing Problem",
        "Hotel Setup Issue",
        "Other"
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [attachmentSchema],
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Closed"],
      default: "Pending",
      index: true
    },
    ipAddress: {
      type: String
    }
  },
  { timestamps: true }
);

publicSupportRequestSchema.index({ createdAt: -1 });

const PublicSupportRequest = mongoose.model("PublicSupportRequest", publicSupportRequestSchema);
export default PublicSupportRequest;
