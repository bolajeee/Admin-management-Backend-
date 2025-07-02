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
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee',
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

const User = mongoose.model("User", userSchema);

export default User;