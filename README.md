# Splatboard

## […LEEEEROYJ's Splatboard](https://leeeeeroyj.github.io/splatboard/)

A ~~scoreboard~~ Wall-of-Squid 🦑 showing players splatted by …LEEEEROYJ in Splatoon 3.  The data comes from reading the game's kill-feed banners off my capture card during live game play.

A python app watches the capture card and monitors highlighted areas for splat notifications to pop up. When it sees one, it captures a screenshot and tries to read the player's name. It can get pretty close, but it's not perfect. The special characters and ASCII art people put in there names can throw it off. For some reason, it named Shiny wrong here... 

The admin app allows me to review the results and make adjustments. The screenshot of the players name makes it really easy to reivew. I could hand this off to AI and probably get better results... for now, I'm still needed. 

For names that had a low confidence score, it puts them in a bucket for me to review. If someone changes their name (like Jim is J1M and J1MB0) I can group them all as 1 pplayer in the stats.

The Export button in the admin packages up the data to be rendered on the Splatboard. Hosting the Splatboard on Github allows me to to export from my tool, commit the results to this repo, and it builds an updated version of the Splatboard. 



## Not affiliated with Nintendo


Splatboard is a personal development project and is not affiliated with,
endorsed by, or sponsored by Nintendo. Splatoon and Splatoon 3 are trademarks
of Nintendo.
