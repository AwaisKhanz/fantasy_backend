const {
  fetchYahooData,
  fetchLeagueTeamsAndStats,
  fetchDraftResults,
  parseLeaguesFromResponse,
  fetchPlayerStats,
  fetchLeagueTransactions,
} = require("../utils/yahooApi");
const League = require("../models/League");
const { fetchTeamRoster } = require("../utils/yahooApi");

exports.getLeagues = async (req, res) => {
  const { accessToken } = req.user;

  try {
    const url =
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games/leagues";
    const response = await fetchYahooData(url, accessToken);
    const leagues = parseLeaguesFromResponse(response);

    const leagueIds = await Promise.all(
      leagues.map(async (leagueData) => {
        let league = await League.findOne({ leagueKey: leagueData.leagueKey });

        const teamsData = await fetchLeagueTeamsAndStats(
          leagueData.leagueKey,
          accessToken
        );
        const draftData = await fetchDraftResults(
          leagueData.leagueKey,
          accessToken
        );

        const transactionsData = await fetchLeagueTransactions(
          leagueData.leagueKey,
          accessToken
        );

        const teamsArray = teamsData?.fantasy_content?.league?.teams?.team
          ? Array.isArray(teamsData.fantasy_content.league.teams.team)
            ? teamsData.fantasy_content.league.teams.team
            : [teamsData.fantasy_content.league.teams.team]
          : [];

        const teams = await Promise.all(
          teamsArray.map(async (team) => {
            const rosterData = await fetchTeamRoster(
              team.team_key,
              accessToken
            );

            const playersArray = rosterData?.fantasy_content?.team?.roster
              ?.players?.player
              ? Array.isArray(
                  rosterData.fantasy_content.team.roster.players.player
                )
                ? rosterData.fantasy_content.team.roster.players.player
                : [rosterData.fantasy_content.team.roster.players.player]
              : [];

            return {
              teamKey: team.team_key,
              teamName: team.name || "Unknown Team",
              wins: parseInt(team.team_standings?.outcome_totals?.wins) || 0,
              losses:
                parseInt(team.team_standings?.outcome_totals?.losses) || 0,
              playoffQualified: team.clinched_playoffs === "1",
              players: await Promise.all(
                playersArray.map(async (player) => {
                  // 1. Fetch player stats
                  const statsData = await fetchPlayerStats(
                    player.player_key,
                    accessToken
                  );
                  const pointsScored =
                    parseFloat(
                      statsData?.fantasy_content?.player?.player_stats?.stats?.find(
                        (s) => s.stat_id === "0"
                      )?.value
                    ) || 0;

                  // 2. Calculate waiver pickups from transaction data
                  const waiverPickups =
                    transactionsData?.fantasy_content?.league?.transactions?.transaction?.filter(
                      (t) =>
                        t.type === "add" &&
                        t.players?.player?.player_id === player.player_id
                    )?.length || 0;

                  // 3. Find draft round from draft data
                  const draftRound =
                    draftData?.fantasy_content?.league?.draft_results?.draft_result?.find(
                      (d) => d.player_id === player.player_id
                    )?.round || null;

                  // 4. Check if the player is injured
                  const injured = ["INJ", "OUT"].includes(player.status);

                  return {
                    playerId: player.player_id,
                    name: player.name?.full || "Unknown Player",
                    pointsScored,
                    waiverPickups,
                    draftRound,
                    injured,
                  };
                })
              ),
            };
          })
        );

        const draftArray = draftData?.fantasy_content?.league?.draft_results
          ?.draft_result
          ? Array.isArray(
              draftData.fantasy_content.league.draft_results.draft_result
            )
          : [draftData.fantasy_content.league.draft_results.draft_result];

        const draftResults = draftArray.map((pick) => ({
          playerId: pick.player_id || "unknown_player_id",
          name: pick.player_name || "Unknown Player",
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
