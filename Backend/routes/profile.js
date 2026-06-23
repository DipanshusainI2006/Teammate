
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Profile = require("../models/Profile");
const User = require("../models/User");

const saveProfile = async (req, res) => {
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

        // Keep User collection in sync
        const userUpdate = {};
        if (req.body.skills) userUpdate.skills = req.body.skills;
        if (req.body.bio) userUpdate.bio = req.body.bio;
        if (req.body.location) userUpdate.location = req.body.location;
        if (req.body.headline) userUpdate.title = req.body.headline;
        if (req.body.profilePic) userUpdate.avatar = req.body.profilePic;

        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(req.user.id, userUpdate);
        }

        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
};

router.post("/", auth, saveProfile);
router.post("/complete", auth, saveProfile);

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
