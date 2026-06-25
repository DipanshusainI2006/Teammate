const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");


// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      skills,
      bio,
      location,
      title
    } = req.body;

    // check existing user
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // convert skills to array
    let skillsArray = [];

if (typeof skills === "string") {
  skillsArray = skills.split(",").map(s => s.trim());
} else if (Array.isArray(skills)) {
  skillsArray = skills;
}

    // create user
    user = new User({
      username,
      email,
      password: hashedPassword,
      skills: skillsArray,
      bio,
      location,
      title
    });

    await user.save();

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.json({ 
      message: "✅ User registered successfully",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================= TALENT HUB (MAIN FEATURE) =================
router.get("/talent-hub", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);

  } catch (err) {
    console.error("Talent Hub Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= USER PROFILE (FOR PROFILE PAGE) =================
router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    
    // Convert to plain JS object to add extra fields
    const userObj = user.toObject();
    
    // Find matching Profile document
    const profile = await Profile.findOne({ user: req.params.userId });
    if (profile) {
      userObj.fullName = profile.fullName;
      userObj.socialLinks = profile.socialLinks;
    } else {
      userObj.fullName = user.username;
      userObj.socialLinks = { github: "", linkedin: "", portfolio: "" };
    }
    
    res.json(userObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/profile/:userId", async (req, res) => {
  try {
    const { bio, skills } = req.body;
    let skillsArray = [];
    if (typeof skills === "string") {
      skillsArray = skills.split(",").map(s => s.trim()).filter(s => s);
    } else if (Array.isArray(skills)) {
      skillsArray = skills;
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { bio, skills: skillsArray },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    
    // Also sync to Profile model if profile document exists
    await Profile.findOneAndUpdate(
      { user: req.params.userId },
      { bio, skills: skillsArray }
    );

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/profile/:userId/avatar", async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { avatar },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    
    // Sync to Profile model if exists
    await Profile.findOneAndUpdate(
      { user: req.params.userId },
      { profilePic: avatar }
    );

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
