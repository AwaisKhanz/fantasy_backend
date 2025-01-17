const Award = require("../models/Award");
const League = require("../models/League");

// ✅ Waiver Wire Maniac - Most waiver pickups
const calculateWaiverWireManiac = (league) => {
  let maxPickups = 0,
    winner = null;

  league.teams.forEach((team) => {
    const waiverCount = team.players.reduce(
      (sum, player) => sum + (player.waiverPickups || 0),
      0
    );

    if (waiverCount > maxPickups) {
      maxPickups = waiverCount;
      winner = team.teamName;
    }
  });

  return {
    awardName: "Waiver Wire Maniac",
    recipient: winner || "No eligible team",
    description: winner
      ? `${winner} made ${maxPickups} successful waiver pickups.`
      : "No team made any waiver pickups.",
    points: maxPickups, // ✅ Added for graph visualization
  };
};

// ✅ The Brady - Best Draft Pick
const calculateBestDraftPick = (league) => {
  if (!league.draftResults.length) {
    return {
      awardName: "The Brady",
      recipient: "No draft data",
      description: "No draft data available.",
      points: 0,
    };
  }

  const bestPick = league.draftResults.reduce((best, player) =>
    !best || player.pointsScored > best.pointsScored ? player : best
  );

  return {
    awardName: "The Brady",
    recipient: bestPick.name,
    description: `${bestPick.name} scored the most points from the draft with ${bestPick.pointsScored} points.`,
    points: bestPick.pointsScored, // ✅ Added for graph visualization
  };
};

// ✅ Toilet Bowl Award - Best non-playoff team
const calculateToiletBowlAward = (league) => {
  let bestTeam = null,
    maxPoints = 0;

  league.teams.forEach((team) => {
    if (!team.playoffQualified) {
      const totalPoints = team.players.reduce(
        (sum, player) => sum + (player.pointsScored || 0),
        0
      );

      if (totalPoints > maxPoints) {
        maxPoints = totalPoints;
        bestTeam = team;
      }
    }
  });

  return {
    awardName: "Toilet Bowl Award",
    recipient: bestTeam ? bestTeam.teamName : "No eligible team",
    description: bestTeam
      ? `${bestTeam.teamName} scored ${maxPoints} points but missed the playoffs.`
      : "No non-playoff teams available.",
    points: maxPoints, // ✅ Added for graph visualization
  };
};

// ✅ Mr. Icepack - Most injured players
const calculateMostInjuries = (league) => {
  let maxInjuries = 0,
    winner = null;

  league.teams.forEach((team) => {
    const injuryCount = team.players.filter((player) => player.injured).length;

    if (injuryCount > maxInjuries) {
      maxInjuries = injuryCount;
      winner = team.teamName;
    }
  });

  return {
    awardName: "Mr. Icepack",
    recipient: winner || "No eligible team",
    description: winner
      ? `${winner} had ${maxInjuries} injured players.`
      : "No team had injured players.",
    points: maxInjuries, // ✅ Added for graph visualization
  };
};

// ✅ Calculate All Awards
exports.calculateAwards = async (leagueKey) => {
  const league = await League.findOne({ leagueKey });
  if (!league) throw new Error("League not found.");

  const awards = [
    calculateWaiverWireManiac(league),
    calculateBestDraftPick(league),
    calculateToiletBowlAward(league),
    calculateMostInjuries(league),
  ];

  // ✅ Save each award to the database
  for (const award of awards) {
    await Award.create({ ...award, league: league._id });
  }

  return awards;
};
