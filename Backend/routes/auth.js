const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");
const { validateSignup, validateLogin } = require("../middleware/validationMiddleware");


// ================= SIGNUP =================
router.post("/signup", validateSignup, async (req, res) => {
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
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
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
router.post("/login", validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // If password is not set on user profile, it means they registered via OAuth
    if (!user.password) {
      let providerName = user.authProvider ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1) : "Social Login";
      return res.status(400).json({ 
        message: `This account is associated with ${providerName}. Please sign in using the ${providerName} button.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
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

// ================= OAUTH LOGINS =================

const allowedOrigins = [
  "https://teammate-abch.onrender.com",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function getValidRedirect(redirectTo) {
  let validRedirect = "http://localhost:5500/li.html";
  if (!redirectTo) return validRedirect;
  try {
    const origin = new URL(redirectTo).origin;
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return redirectTo;
    }
  } catch (e) {}
  return validRedirect;
}

// ---------------- Google OAuth ----------------
router.get("/google", (req, res) => {
  const redirectTo = req.query.redirect_to;
  const validRedirect = getValidRedirect(redirectTo);

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" "),
    state: Buffer.from(validRedirect).toString("base64")
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  let redirectTo = "http://localhost:5500/li.html";
  if (state) {
    try {
      redirectTo = Buffer.from(state, "base64").toString("utf-8");
    } catch (e) {}
  }

  if (!code) {
    return res.redirect(`${redirectTo}?error=Google authorization code not found`);
  }

  try {
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const values = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code"
    };

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(values)
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Google token exchange error:", errorText);
      return res.redirect(`${redirectTo}?error=Failed to exchange Google token`);
    }

    const { access_token } = await tokenRes.json();

    const userInfoUrl = `https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${access_token}`;
    const userRes = await fetch(userInfoUrl);
    if (!userRes.ok) {
      console.error("Google userinfo fetch failed");
      return res.redirect(`${redirectTo}?error=Failed to fetch Google user info`);
    }

    const googleUser = await userRes.json();
    const { sub: googleId, email, name, picture } = googleUser;

    if (!email) {
      return res.redirect(`${redirectTo}?error=Google account does not provide an email`);
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let username = name || email.split("@")[0];
      username = username.replace(/[^a-zA-Z0-9\s_-]/g, "");
      
      let existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = new User({
        username,
        email: email.toLowerCase(),
        googleId,
        authProvider: "google",
        avatar: picture || ""
      });
      await user.save();
    } else {
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (user.authProvider === "local" || !user.authProvider) {
        user.authProvider = "google";
        updated = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const redirectUrl = new URL(redirectTo);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("userId", user._id.toString());
    redirectUrl.searchParams.set("username", user.username);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("avatar", user.avatar || "");
    redirectUrl.searchParams.set("isNewUser", isNewUser ? "true" : "false");

    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${redirectTo}?error=Server error during Google login`);
  }
});

// ---------------- GitHub OAuth ----------------
router.get("/github", (req, res) => {
  const redirectTo = req.query.redirect_to;
  const validRedirect = getValidRedirect(redirectTo);

  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "user:email",
    state: Buffer.from(validRedirect).toString("base64")
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

router.get("/github/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  let redirectTo = "http://localhost:5500/li.html";
  if (state) {
    try {
      redirectTo = Buffer.from(state, "base64").toString("utf-8");
    } catch (e) {}
  }

  if (!code) {
    return res.redirect(`${redirectTo}?error=GitHub authorization code not found`);
  }

  try {
    const tokenUrl = "https://github.com/login/oauth/access_token";
    const values = {
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: process.env.GITHUB_CALLBACK_URL
    };

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json" 
      },
      body: new URLSearchParams(values)
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("GitHub token exchange error:", errorText);
      return res.redirect(`${redirectTo}?error=Failed to exchange GitHub token`);
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${access_token}`,
        "User-Agent": "Teammate-OAuth-App"
      }
    });

    if (!userRes.ok) {
      console.error("GitHub user fetch failed");
      return res.redirect(`${redirectTo}?error=Failed to fetch GitHub profile`);
    }

    const githubUser = await userRes.json();
    const githubId = githubUser.id ? githubUser.id.toString() : null;
    let email = githubUser.email;
    const name = githubUser.name || githubUser.login;
    const avatar = githubUser.avatar_url;

    if (!githubId) {
      return res.redirect(`${redirectTo}?error=Failed to retrieve GitHub ID`);
    }

    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          "Authorization": `token ${access_token}`,
          "User-Agent": "Teammate-OAuth-App"
        }
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primaryEmailObj = emails.find(e => e.primary && e.verified);
        if (primaryEmailObj) {
          email = primaryEmailObj.email;
        } else if (emails.length > 0) {
          email = emails[0].email;
        }
      }
    }

    if (!email) {
      return res.redirect(`${redirectTo}?error=GitHub account does not provide an email`);
    }

    let user = await User.findOne({ $or: [{ githubId }, { email: email.toLowerCase() }] });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let username = name || email.split("@")[0];
      username = username.replace(/[^a-zA-Z0-9\s_-]/g, "");

      let existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = new User({
        username,
        email: email.toLowerCase(),
        githubId,
        authProvider: "github",
        avatar: avatar || ""
      });
      await user.save();
    } else {
      let updated = false;
      if (!user.githubId) {
        user.githubId = githubId;
        updated = true;
      }
      if (user.authProvider === "local" || !user.authProvider) {
        user.authProvider = "github";
        updated = true;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const redirectUrl = new URL(redirectTo);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("userId", user._id.toString());
    redirectUrl.searchParams.set("username", user.username);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("avatar", user.avatar || "");
    redirectUrl.searchParams.set("isNewUser", isNewUser ? "true" : "false");

    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.redirect(`${redirectTo}?error=Server error during GitHub login`);
  }
});

// ---------------- LinkedIn OAuth ----------------
router.get("/linkedin", (req, res) => {
  const redirectTo = req.query.redirect_to;
  const validRedirect = getValidRedirect(redirectTo);

  const rootUrl = "https://www.linkedin.com/oauth/v2/authorization";
  const options = {
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    state: Buffer.from(validRedirect).toString("base64"),
    scope: "openid profile email"
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

router.get("/linkedin/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  let redirectTo = "http://localhost:5500/li.html";
  if (state) {
    try {
      redirectTo = Buffer.from(state, "base64").toString("utf-8");
    } catch (e) {}
  }

  if (!code) {
    return res.redirect(`${redirectTo}?error=LinkedIn authorization code not found`);
  }

  try {
    const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
    const values = {
      grant_type: "authorization_code",
      code,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: process.env.LINKEDIN_CALLBACK_URL
    };

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(values)
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("LinkedIn token exchange error:", errorText);
      return res.redirect(`${redirectTo}?error=Failed to exchange LinkedIn token`);
    }

    const { access_token } = await tokenRes.json();

    const userInfoUrl = "https://api.linkedin.com/v2/userinfo";
    const userRes = await fetch(userInfoUrl, {
      headers: {
        "Authorization": `Bearer ${access_token}`
      }
    });

    if (!userRes.ok) {
      console.error("LinkedIn userinfo fetch failed");
      return res.redirect(`${redirectTo}?error=Failed to fetch LinkedIn user info`);
    }

    const linkedinUser = await userRes.json();
    const linkedinId = linkedinUser.sub;
    const email = linkedinUser.email;
    const name = linkedinUser.name;
    const picture = linkedinUser.picture;

    if (!linkedinId) {
      return res.redirect(`${redirectTo}?error=Failed to retrieve LinkedIn ID`);
    }

    if (!email) {
      return res.redirect(`${redirectTo}?error=LinkedIn account does not provide an email`);
    }

    let user = await User.findOne({ $or: [{ linkedinId }, { email: email.toLowerCase() }] });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let username = name || email.split("@")[0];
      username = username.replace(/[^a-zA-Z0-9\s_-]/g, "");

      let existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = new User({
        username,
        email: email.toLowerCase(),
        linkedinId,
        authProvider: "linkedin",
        avatar: picture || ""
      });
      await user.save();
    } else {
      let updated = false;
      if (!user.linkedinId) {
        user.linkedinId = linkedinId;
        updated = true;
      }
      if (user.authProvider === "local" || !user.authProvider) {
        user.authProvider = "linkedin";
        updated = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const redirectUrl = new URL(redirectTo);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("userId", user._id.toString());
    redirectUrl.searchParams.set("username", user.username);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("avatar", user.avatar || "");
    redirectUrl.searchParams.set("isNewUser", isNewUser ? "true" : "false");

    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    res.redirect(`${redirectTo}?error=Server error during LinkedIn login`);
  }
});

module.exports = router;
