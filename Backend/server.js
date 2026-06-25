const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

const path = require("path");
app.use(express.static(path.join(__dirname, "..")));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/teammate", {
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