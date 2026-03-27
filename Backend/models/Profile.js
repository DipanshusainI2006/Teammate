
const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fullName: { type: String, default: "" },
    headline: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: [String], default: [] },
    socialLinks: {
        github: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        portfolio: { type: String, default: "" }
    }
}, { timestamps: true });

module.exports = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
