const mongoose = require("mongoose");
const { Schema } = mongoose;

const inAppNotificationSchema = new Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// const model = mongoose.model("inAppNotifications", inAppNotificationSchema);

// module.exports = model;
