# Eris
A smash bros ELO ladder discord.js bot


```
/register <region> - Registers you to the database in order to /search or accept ranked matches

/region <region> - Allows you to change your region to the specified region. Also updates your handle in the database to your current discord handle.

/search - Allows you to search for a ranked match. Anyone can accept the match as long as they are registered

/leave - If in a match thread, it forfeits the current match and ends the game, leaving your opponent as the winner.

/dispute - Ends a ranked match due to a problem, this command will add a dispute flag to both you and your opponents profile when used. It will cancel the current in progress match.

/leaderboard [region] - Allows you to view the ELO leaderboard, to view a specific region you can type the region you would like to view after /leaderboard

/getinfo <@Player> - Allows you to view statistics about a specific player in the database. Please note that this command does NOT mention (ping) the specified player

/rules - Displays the current bot ruleset

/ping - Checks if the bot is online
```
