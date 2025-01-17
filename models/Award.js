const mongoose = require("mongoose");

const awardSchema = new mongoose.Schema({
  awardName: { type: String, required: true },
  recipient: { type: String, required: true },
  description: { type: String },
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "League",
    required: true,
  },
});

module.exports = mongoose.model("Award", awardSchema);
