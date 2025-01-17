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

        const teamsArray = Array.isArray(
          teamsData?.fantasy_content?.league?.teams?.team
        )
          ? teamsData.fantasy_content.league.teams.team
          : [teamsData?.fantasy_content?.league?.teams?.team].filter(Boolean);

        const teams = await Promise.all(
          teamsArray.map(async (team) => {
            const rosterData = await fetchTeamRoster(
              team.team_key,
              accessToken
            );

            const playersArray = Array.isArray(
              rosterData?.fantasy_content?.team?.roster?.players?.player
            )
              ? rosterData.fantasy_content.team.roster.players.player
              : [
                  rosterData?.fantasy_content?.team?.roster?.players?.player,
                ].filter(Boolean);

            return {
              teamKey: team.team_key,
              teamName: team.name || "Unknown Team",
              wins: parseInt(team.team_standings?.outcome_totals?.wins) || 0,
              losses:
                parseInt(team.team_standings?.outcome_totals?.losses) || 0,
              playoffQualified: team.clinched_playoffs === "1",
              players: await Promise.all(
                playersArray.map(async (player) => {
                  if (!player || !player.player_id) {
                    console.warn(
                      "Skipped player due to missing player_id:",
                      player
                    );
                    return null;
                  }

                  let statsData = {};
                  try {
                    statsData = await fetchPlayerStats(
                      player.player_key,
                      accessToken
                    );
                  } catch (err) {
                    console.warn(
                      `Failed to fetch stats for player ${player.player_key}:`,
                      err
                    );
                  }

                  const pointsScored =
                    Array.isArray(
                      statsData?.fantasy_content?.player?.player_stats?.stats
                    ) &&
                    statsData.fantasy_content.player.player_stats.stats.length >
                      0
                      ? parseFloat(
                          statsData.fantasy_content.player.player_stats.stats.find(
                            (s) => s.stat_id === "0"
                          )?.value
                        ) || 0
                      : 0;

                  const waiverPickups = Array.isArray(
                    transactionsData?.fantasy_content?.league?.transactions
                      ?.transaction
                  )
                    ? transactionsData.fantasy_content.league.transactions.transaction.filter(
                        (t) =>
                          t?.type === "add" &&
                          t?.players?.player?.player_id === player.player_id
                      )?.length
                    : 0;

                  const draftRound = Array.isArray(
                    draftData?.fantasy_content?.league?.draft_results
                      ?.draft_result
                  )
                    ? draftData.fantasy_content.league.draft_results.draft_result.find(
                        (d) => d?.player_id === player.player_id
                      )?.round || null
                    : null;

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
              ).then((players) => players.filter(Boolean)), // Remove null entries
            };
          })
        );

        console.log(teams, "teams data from api");

        const draftArray = Array.isArray(
          draftData?.fantasy_content?.league?.draft_results?.draft_result
        )
          ? draftData.fantasy_content.league.draft_results.draft_result
          : [
              draftData?.fantasy_content?.league?.draft_results?.draft_result,
            ].filter(Boolean);

        console.log(draftArray, "draftArray from");

        const draftResults =
          Array.isArray(draftArray) && draftArray.length > 0
            ? draftArray.map((pick) => ({
                playerId: pick?.player_id || "unknown_player_id",
                name: pick?.player_name || "Unknown Player",
                draftRound: parseInt(pick?.round) || null,
              }))
            : [];

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
    console.error("Error fetching leagues:", error);
    return res.status(500).json({ message: "Failed to fetch leagues." });
  }
};
