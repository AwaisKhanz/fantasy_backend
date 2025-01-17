const axios = require("axios");

exports.refreshYahooAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post(
      "https://api.login.yahoo.com/oauth2/get_token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      })
    );
    return response.data;
  } catch (error) {
    console.error(
      "Failed to refresh access token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to refresh access token");
  }
};
