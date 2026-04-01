const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


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

    res.json({ message: "✅ User registered successfully" });

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
      { userId: user._id },
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


module.exports = router;
