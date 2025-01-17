const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2");
const User = require("../models/User");
const { fetchYahooGuid, fetchUserInfo } = require("../utils/yahooApi");

// Strategy configuration
passport.use(
  "yahoo",
  new OAuth2Strategy(
    {
      authorizationURL: "https://api.login.yahoo.com/oauth2/request_auth",
      tokenURL: "https://api.login.yahoo.com/oauth2/get_token",
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/yahoo/callback`,
      scope: ["openid", "profile", "email", "fspt-r", "fspt-w"],
      accessType: "offline",
      prompt: "consent",
    },
    async (accessToken, refreshToken, params, profile, done) => {
      try {
        const userGuid = await fetchYahooGuid(accessToken);
        if (!userGuid) throw new Error("Yahoo GUID not found.");

        const userInfo = await fetchUserInfo(accessToken);

        const {
          name,
          nickname,
          email,
          picture: profilePicture,
          gender,
        } = userInfo;

        const user = await User.findOneAndUpdate(
          { yahooId: userGuid },
          {
            $set: {
              username: nickname || name || `User_${userGuid}`,
              email: email || "email@example.com",
              profilePicture,
              gender: gender || "notDisclosed",
              accessToken,
              refreshToken,
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return done(null, user);
      } catch (error) {
        console.error("Error during Yahoo OAuth2 process:", error.message);
        return done(error, null);
      }
    }
  )
);

// Serialize and Deserialize User for Session Management
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Export Authentication Functions
exports.authenticateYahoo = passport.authenticate("yahoo", {
  scope: ["openid", "profile", "email", "fspt-w"],
});

exports.handleCallback = async (req, res) => {
  try {
    const user = req.user;

    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with the token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    res.status(500).send("OAuth Callback Failed");
  }
};
