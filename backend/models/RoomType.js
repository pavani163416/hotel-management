import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Room type code is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Room type name is required"],
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const RoomType = mongoose.model("RoomType", roomTypeSchema);
export default RoomType;
