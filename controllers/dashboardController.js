const {
  fetchYahooData,
  fetchLeagueTeamsAndStats,
  fetchDraftResults,
  parseLeaguesFromResponse,
} = require("../utils/yahooApi");
const League = require("../models/League");

exports.getLeagues = async (req, res) => {
  const { accessToken } = req.user;

  console.log(accessToken);

  try {
    const url =
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games/leagues";
    const response = await fetchYahooData(url, accessToken);
    const leagues = parseLeaguesFromResponse(response);

    const leagueIds = await Promise.all(
      leagues.map(async (leagueData) => {
        let league = await League.findOne({ leagueKey: leagueData.leagueKey });

        // Fetch Teams and Draft Data
        const teamsData = await fetchLeagueTeamsAndStats(
          leagueData.leagueKey,
          accessToken
        );
        const draftData = await fetchDraftResults(
          leagueData.leagueKey,
          accessToken
        );

        console.log(JSON.stringify(teamsData, null, 2), "teamsData");
        console.log(JSON.stringify(draftData, null, 2), "draftData");

        // Handle single object or array for teams
        const teamsArray = teamsData?.fantasy_content?.league?.teams?.team
          ? Array.isArray(teamsData.fantasy_content.league.teams.team)
            ? teamsData.fantasy_content.league.teams.team
            : [teamsData.fantasy_content.league.teams.team]
          : [];

        const teams = teamsArray.map((team) => ({
          teamName: team.name,
          wins: parseInt(team.team_standings?.outcome_totals?.wins) || 0,
          losses: parseInt(team.team_standings?.outcome_totals?.losses) || 0,
          playoffQualified: team.team_standings?.playoff_seed ? true : false,
          players: (team.roster?.players?.player
            ? Array.isArray(team.roster.players.player)
              ? team.roster.players.player
              : [team.roster.players.player]
            : []
          ).map((player) => ({
            name: player.name?.full,
            pointsScored:
              parseFloat(
                player.player_stats?.stats?.find((s) => s.stat_id === "0")
                  ?.value
              ) || 0,
            waiverPickups:
              parseInt(player.transaction_data?.waiver?.count) || 0,
            draftRound: parseInt(player.draft_analysis?.round) || null,
            injured:
              player.injury_status === "INJ" || player.injury_status === "OUT",
          })),
        }));

        // Handle single object or array for draft results
        const draftArray = draftData?.fantasy_content?.league?.draft_results
          ?.draft_result
          ? Array.isArray(
              draftData.fantasy_content.league.draft_results.draft_result
            )
            ? draftData.fantasy_content.league.draft_results.draft_result
            : [draftData.fantasy_content.league.draft_results.draft_result]
          : [];

        const draftResults = draftArray.map((pick) => ({
          name: pick.player_name,
          pointsScored:
            parseFloat(
              pick.player_stats?.stats?.find((s) => s.stat_id === "0")?.value
            ) || 0,
          draftRound: parseInt(pick.round) || null,
        }));

        if (!league) {
          league = new League({
            leagueKey: leagueData.leagueKey,
            name: leagueData.name,
            season: leagueData.season,
            teams,
            draftResults,
          });
        } else {
          league.teams = teams;
          league.draftResults = draftResults;
        }

        await league.save();
        return league._id;
      })
    );

    await req.user.updateOne({ $set: { leagues: leagueIds } });
    const updatedLeagues = await League.find({ _id: { $in: leagueIds } });

    return res.status(200).json({ leagues: updatedLeagues });
  } catch (error) {
    console.error("Error fetching leagues:", error.message);
    return res.status(500).json({ message: "Failed to fetch leagues." });
  }
};
