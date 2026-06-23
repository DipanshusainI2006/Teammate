const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Project = require("../models/Project");

// ================= CREATE A PROJECT =================
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, skills, membersNeeded, icon } = req.body;
    if (!title || !description) {
      return res.status(400).json({ msg: "Please enter a title and description" });
    }

    let skillsArray = [];
    if (typeof skills === "string") {
      skillsArray = skills.split(",").map(s => s.trim()).filter(s => s);
    } else if (Array.isArray(skills)) {
      skillsArray = skills;
    }

    const newProject = new Project({
      title,
      description,
      skills: skillsArray,
      membersNeeded: membersNeeded || 1,
      icon: icon || "fa-project-diagram",
      creator: req.user.id,
      members: [req.user.id] // Creator is the first member
    });

    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ================= GET ALL PROJECTS =================
router.get("/", async (req, res) => {
  try {
    const { skill } = req.query;
    let query = {};
    if (skill) {
      query.skills = { $regex: skill, $options: "i" };
    }
    const projects = await Project.find(query)
      .populate("creator", ["username", "email"])
      .populate("members", ["username", "email", "avatar"])
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ================= GET CURRENT USER'S PROJECTS =================
router.get("/my-projects", auth, async (req, res) => {
  try {
    // Find projects created by user, where user is a member, or user has applied
    const projects = await Project.find({
      $or: [
        { creator: req.user.id },
        { members: req.user.id },
        { "applicants.user": req.user.id }
      ]
    })
    .populate("creator", ["username", "email"])
    .populate("members", ["username", "email", "avatar"])
    .populate("applicants.user", ["username", "email", "avatar"]);
    
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ================= APPLY TO A PROJECT =================
router.post("/:projectId/apply", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Check if user is already the creator/member
    if (project.creator.toString() === req.user.id || project.members.includes(req.user.id)) {
      return res.status(400).json({ msg: "You are already a member of this project" });
    }

    // Check if already applied
    const alreadyApplied = project.applicants.some(
      app => app.user.toString() === req.user.id
    );
    if (alreadyApplied) {
      return res.status(400).json({ msg: "You have already applied to this project" });
    }

    project.applicants.push({ user: req.user.id, status: "pending" });
    await project.save();
    res.json({ msg: "Application submitted successfully", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ================= PROCESS APPLICATION ACTION (ACCEPT / REJECT) =================
router.post("/:projectId/action", auth, async (req, res) => {
  try {
    const { applicantId, action } = req.body; // action: "accept" or "reject"
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ msg: "Invalid action" });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Check if user is creator
    if (project.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to manage this project" });
    }

    // Find applicant
    const applicantIndex = project.applicants.findIndex(
      app => app.user.toString() === applicantId
    );
    if (applicantIndex === -1) {
      return res.status(400).json({ msg: "Applicant not found" });
    }

    if (action === "accept") {
      project.applicants[applicantIndex].status = "accepted";
      // Add user to members if not already
      if (!project.members.includes(applicantId)) {
        project.members.push(applicantId);
      }
    } else {
      project.applicants[applicantIndex].status = "rejected";
    }

    await project.save();
    res.json({ msg: `Applicant successfully ${action}ed`, project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
