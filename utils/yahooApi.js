const axios = require("axios");
const xml2js = require("xml2js");

const parseXML = async (xmlData) => {
  const parser = new xml2js.Parser({ explicitArray: false });
  return await parser.parseStringPromise(xmlData);
};

exports.fetchYahooGuid = async (accessToken) => {
  try {
    const response = await axios.get(
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const parsedData = await parseXML(response.data);
    return parsedData?.fantasy_content?.users?.user?.guid || null;
  } catch (error) {
    console.error(
      "Yahoo GUID Fetch Error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch Yahoo GUID: " + error.message);
  }
};

exports.fetchUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(
      "https://api.login.yahoo.com/openid/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch user info: " + error.message);
  }
};

exports.fetchYahooData = async (url, accessToken) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const parsedData = await parseXML(response.data);
    return parsedData;
  } catch (error) {
    console.error(
      `Error fetching data from ${url}:`,
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch data from Yahoo API");
  }
};

exports.parseLeaguesFromResponse = (data) => {
  const gamesData = data?.fantasy_content?.users?.user?.games?.game || [];
  const leagues = [];

  // Ensure `gamesData` is always an array
  const gamesArray = Array.isArray(gamesData) ? gamesData : [gamesData];

  gamesArray.forEach((game) => {
    const leaguesData = game?.leagues?.league || [];

    // Ensure `leaguesData` is always an array
    const leaguesArray = Array.isArray(leaguesData)
      ? leaguesData
      : [leaguesData];

    leaguesArray.forEach((league) => {
      leagues.push({
        leagueKey: league.league_key,
        leagueId: league.league_id,
        name: league.name,
        url: league.url,
        season: league.season,
        numTeams: league.num_teams,
        logoUrl: league.logo_url || "",
        draftStatus: league.draft_status || "",
        leagueType: league.league_type || "",
      });
    });
  });

  return leagues;
};

const fetchYahooData = async (url, accessToken) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const parsedData = await parseXML(response.data);
    return parsedData;
  } catch (error) {
    console.error(
      `Error fetching data from ${url}:`,
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch data from Yahoo API");
  }
};

exports.fetchTeamRoster = async (teamKey, accessToken) => {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster`;
  const response = await fetchYahooData(url, accessToken);
  return response;
};

// Fetch player stats and team performance
exports.fetchLeagueTeamsAndStats = async (leagueKey, accessToken) => {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams`;
  const response = await fetchYahooData(url, accessToken);
  return response;
};

// Fetch draft results
exports.fetchDraftResults = async (leagueKey, accessToken) => {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/draftresults`;
  const response = await fetchYahooData(url, accessToken);
  return response;
};
