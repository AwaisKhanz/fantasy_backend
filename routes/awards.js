const express = require("express");
const { calculateAwards } = require("../services/awardService");
const authenticateJWT = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/calculate/:leagueKey", authenticateJWT, async (req, res) => {
  try {
    const awards = await calculateAwards(req.params.leagueKey);
    res.status(200).json({ awards });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error calculating awards" });
  }
});

module.exports = router;
