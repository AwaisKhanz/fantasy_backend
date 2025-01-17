const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  yahooId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String },
  profilePicture: { type: String },
  gender: { type: String, default: "notDisclosed" },
  accessToken: { type: String },
  refreshToken: { type: String },
  leagues: [{ type: mongoose.Schema.Types.ObjectId, ref: "League" }],
});

module.exports = mongoose.model("User", userSchema);
