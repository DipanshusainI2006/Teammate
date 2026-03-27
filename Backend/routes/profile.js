
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Profile = require("../models/Profile");

router.post("/", auth, async (req, res) => {
    try {
        const profileData = { user: req.user.id, ...req.body };

        let profile = await Profile.findOne({ user: req.user.id });

        if (profile) {
            profile = await Profile.findOneAndUpdate(
                { user: req.user.id },
                profileData,
                { new: true }
            );
        } else {
            profile = new Profile(profileData);
            await profile.save();
        }

        res.json(profile);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

router.get("/", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id })
            .populate("user", ["username", "email"]);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
