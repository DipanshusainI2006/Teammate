const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const Request = require("../models/Request");
const Message = require("../models/Message");

// ==========================================
// 1. SEND CONNECTION REQUEST
// ==========================================
router.post("/request/:id", auth, async (req, res) => {
  try {
    const recipientId = req.params.id;
    const senderId = req.user.id;

    if (recipientId === senderId) {
      return res.status(400).json({ msg: "You cannot send a connection request to yourself" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if request already exists (either sender -> recipient or recipient -> sender)
    const existingRequest = await Request.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({ msg: "You are already connected with this user" });
      } else if (existingRequest.status === "pending") {
        return res.status(400).json({ msg: "A connection request is already pending between you" });
      } else {
        // If previously rejected, allow sending a new one by resetting status to pending
        existingRequest.sender = senderId;
        existingRequest.recipient = recipientId;
        existingRequest.status = "pending";
        await existingRequest.save();
        return res.json({ msg: "Connection request sent successfully", request: existingRequest });
      }
    }

    const newRequest = new Request({
      sender: senderId,
      recipient: recipientId,
      status: "pending"
    });

    await newRequest.save();
    res.json({ msg: "Connection request sent successfully", request: newRequest });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 2. GET PENDING RECEIVED REQUESTS
// ==========================================
router.get("/requests/pending", auth, async (req, res) => {
  try {
    const requests = await Request.find({
      recipient: req.user.id,
      status: "pending"
    }).populate("sender", "username email avatar title location");

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 3. ACCEPT OR REJECT CONNECTION REQUEST
// ==========================================
router.post("/request/:requestId/action", auth, async (req, res) => {
  try {
    const { action } = req.body; // "accept" or "reject"
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ msg: "Invalid action" });
    }

    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    // Verify recipient
    if (request.recipient.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to action this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ msg: `Request has already been ${request.status}` });
    }

    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    // If accepted, send a welcome greeting message
    if (action === "accept") {
      const welcomeMsg = new Message({
        sender: request.recipient, // recipient of request is now the sender of welcome message
        recipient: request.sender,
        content: "Hi! We are now connected on Teammate. Let's collaborate!"
      });
      await welcomeMsg.save();
    }

    res.json({ msg: `Request ${action}ed successfully`, request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 4. LIST ALL ACCEPTED CONNECTIONS
// ==========================================
router.get("/list", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connections = await Request.find({
      status: "accepted",
      $or: [{ sender: userId }, { recipient: userId }]
    }).populate("sender recipient", "username email avatar title location bio");

    // Extract the other user from the populated connection documents
    const list = connections.map(c => {
      return c.sender._id.toString() === userId ? c.recipient : c.sender;
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 5. GET CHAT MESSAGES WITH A USER
// ==========================================
router.get("/messages/:userId", auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    }).sort({ createdAt: 1 }); // Sorted chronologically

    // Mark messages sent by the other user as read
    await Message.updateMany(
      { sender: otherUserId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 6. SEND MESSAGE TO A CONNECTION
// ==========================================
router.post("/messages/:userId", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({ msg: "Message content is required" });
    }

    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Verify they are connected first
    const isConnected = await Request.findOne({
      status: "accepted",
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    });

    if (!isConnected) {
      return res.status(400).json({ msg: "You can only message users you are connected with" });
    }

    const newMessage = new Message({
      sender: currentUserId,
      recipient: otherUserId,
      content: content.trim()
    });

    await newMessage.save();
    res.json(newMessage);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 7. GET ACTIVE CHAT SUMMARIES (CONVERSATIONS)
// ==========================================
router.get("/chats", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    }).sort({ createdAt: -1 });

    const conversationUsers = new Map();

    for (let msg of messages) {
      const otherUser = msg.sender.toString() === userId ? msg.recipient.toString() : msg.sender.toString();
      if (!conversationUsers.has(otherUser)) {
        conversationUsers.set(otherUser, msg);
      }
    }

    // Populate user details for each key in Map
    const userIds = Array.from(conversationUsers.keys());
    const users = await User.find({ _id: { $in: userIds } }).select("username email avatar title location");

    const chatsList = users.map(user => {
      const lastMessage = conversationUsers.get(user._id.toString());
      return {
        user,
        lastMessage: {
          content: lastMessage.content,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt,
          read: lastMessage.read
        }
      };
    });

    // Sort chats by last message timestamp desc
    chatsList.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json(chatsList);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 8. GET CONNECTION STATUS WITH A USER
// ==========================================
router.get("/status/:userId", auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;

    const request = await Request.findOne({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    });

    if (!request) {
      return res.json({ status: "none" });
    }

    res.json({
      status: request.status,
      sender: request.sender,
      recipient: request.recipient,
      requestId: request._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
