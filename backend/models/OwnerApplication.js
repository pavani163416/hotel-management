import mongoose from "mongoose";

const ownerApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    hotelName: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
    },
    hotelAddress: {
      type: String,
      required: [true, "Hotel address is required"],
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    kycDocuments: [
      {
        type: { type: String }, // e.g. "aadhar", "pan", etc.
        url: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processing_upload", "suspended"],
      default: "pending",
    },
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    }
  },
  {
    timestamps: true,
    collection: "ownerapplications",
  }
);

const OwnerApplication = mongoose.model("OwnerApplication", ownerApplicationSchema);
export default OwnerApplication;
