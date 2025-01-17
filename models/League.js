const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pointsScored: { type: Number, default: 0 },
  waiverPickups: { type: Number, default: 0 },
  draftRound: { type: Number },
  injured: { type: Boolean, default: false },
});

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  playoffQualified: { type: Boolean, default: false },
  players: [playerSchema],
});

const leagueSchema = new mongoose.Schema({
  leagueKey: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  season: { type: String, required: true },
  teams: [teamSchema],
  draftResults: [playerSchema],
});

module.exports = mongoose.model("League", leagueSchema);
