const express = require("express");
const { getLeagues } = require("../controllers/dashboardController");
const authenticateJWT = require("../middleware/authMiddleware");

const router = express.Router();

// Apply JWT middleware to protect this route
router.get("/get-leagues", authenticateJWT, getLeagues);

module.exports = router;
