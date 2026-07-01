const validateSignup = (req, res, next) => {
  const { username, email, password } = req.body;

  // 1. Username validation
  if (!username || typeof username !== "string") {
    return res.status(400).json({ message: "Username is required and must be a string." });
  }
  const cleanUsername = username.trim();
  if (cleanUsername.length < 2 || cleanUsername.length > 30) {
    return res.status(400).json({ message: "Username must be between 2 and 30 characters." });
  }
  const usernameRegex = /^[a-zA-Z0-9\s_-]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({ message: "Username can only contain letters, numbers, spaces, dashes, and underscores." });
  }

  // 2. Email validation
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required and must be a string." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  // 3. Password validation
  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "Password is required and must be a string." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  // Simple HTML Tag Stripper for text fields
  const sanitize = (val) => {
    if (typeof val === "string") {
      return val.replace(/<[^>]*>/g, "");
    }
    return val;
  };

  // Sync back sanitized/formatted properties
  req.body.username = cleanUsername;
  req.body.email = email.trim().toLowerCase();
  
  if (req.body.bio) req.body.bio = sanitize(req.body.bio);
  if (req.body.location) req.body.location = sanitize(req.body.location);
  if (req.body.title) req.body.title = sanitize(req.body.title);

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required." });
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ message: "Password is required." });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

module.exports = {
  validateSignup,
  validateLogin
};
