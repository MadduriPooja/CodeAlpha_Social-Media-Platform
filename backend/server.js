const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("../frontend")); // serve frontend

// In-memory "database"
let users = [];
let posts = [];
let comments = [];
let follows = [];

// --- User Routes ---
app.post("/api/users", (req, res) => {
  const { username, bio } = req.body;
  const user = { id: users.length + 1, username, bio, followers: [], following: [] };
  users.push(user);
  res.json(user);
});

app.get("/api/users", (req, res) => res.json(users));

// --- Post Routes ---
app.post("/api/posts", (req, res) => {
  const { userId, content } = req.body;
  const post = { id: posts.length + 1, userId, content, likes: [], comments: [] };
  posts.push(post);
  res.json(post);
});

app.get("/api/posts", (req, res) => res.json(posts));

// --- Comment Routes ---
app.post("/api/comments", (req, res) => {
  const { postId, userId, text } = req.body;
  const comment = { id: comments.length + 1, postId, userId, text };
  comments.push(comment);
  const post = posts.find(p => p.id === postId);
  if (post) post.comments.push(comment.id);
  res.json(comment);
});

// --- Like System ---
app.post("/api/posts/:id/like", (req, res) => {
  const { userId } = req.body;
  const post = posts.find(p => p.id == req.params.id);
  if (post && !post.likes.includes(userId)) post.likes.push(userId);
  res.json(post);
});

// --- Follow System ---
app.post("/api/follow", (req, res) => {
  const { followerId, followingId } = req.body;
  const follower = users.find(u => u.id === followerId);
  const following = users.find(u => u.id === followingId);
  if (follower && following) {
    follower.following.push(followingId);
    following.followers.push(followerId);
    follows.push({ followerId, followingId });
  }
  res.json({ follower, following });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
