import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 3,
    max: 50,
  },
  email: {
    type: String,
    required: true,
    max: 50,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  },
  profilePicture: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
  },
  socketId: {
    type: String,
    default: "",
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  settings: {
  notifications: {
    email: { type: Boolean, default: true },
    browser: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  privacy: {
    showOnlineStatus: { type: Boolean, default: true },
    showReadReceipts: { type: Boolean, default: true }
  }
},
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Index for faster queries on commonly used fields
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ team: 1 });

const User = mongoose.model("User", userSchema);

export default User;