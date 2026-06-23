const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: { type: [String], default: [] },
  membersNeeded: { type: Number, default: 1 },
  icon: { type: String, default: "fa-project-diagram" },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  applicants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model("Project", ProjectSchema);
