const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Assert Environment Configuration Integrity
if (!process.env.MONGO_URI) {
  console.error("❌ Critical Error: MONGO_URI is not set in environment variables!");
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "secret123" || process.env.JWT_SECRET === "mysecretkey123") {
  console.error("❌ Critical Error: JWT_SECRET is not set, or is using an insecure/default key!");
  process.exit(1);
}

const app = express();

// Hardened CORS policy supporting developer local servers
const allowedOrigins = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error(`CORS Policy Error: Origin ${origin} is unauthorized.`), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Restrict payload limit to 2mb to avoid DoS memory exhaust
app.use(express.json({ limit: "2mb" }));

// Test routes
app.get("/", (req, res) => {
  res.send("API Running - Teammate Backend");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const profileRoutes = require("./routes/profile");
app.use("/api/profile", profileRoutes);

const projectsRoutes = require("./routes/projects");
app.use("/api/projects", projectsRoutes);

const connectionsRoutes = require("./routes/connections");
app.use("/api/connections", connectionsRoutes);

const examsRoutes = require("./routes/exams");
app.use("/api/exams", examsRoutes);

const path = require("path");
app.use(express.static(path.join(__dirname, "..")));

// MongoDB connection with no weak defaults
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log("❌ MongoDB connection error:", err));

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});