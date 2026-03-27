const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Talent Hub fields
  skills: { type: [String], default: [] },
  bio: { type: String, default: "" },
  location: { type: String, default: "India" },
  title: { type: String, default: "Teammate" },
  experience: { type: Number, default: 0 },
  projects: { type: Number, default: 0 },
  avatar: { type: String, default: "" },
  status: { type: String, default: "available" }

}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);