const express = require("express");
const passport = require("passport");
const {
  handleCallback,
  authenticateYahoo,
} = require("../controllers/authController");

const router = express.Router();

// Yahoo authentication
router.get("/yahoo", authenticateYahoo);

// Yahoo callback
router.get(
  "/yahoo/callback",
  passport.authenticate("yahoo", { failureRedirect: "/" }),
  handleCallback
);

module.exports = router;
