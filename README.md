# Splatboard

A ~~scoreboard~~ Wall-of-Squid 🦑 showing players splatted by …LEEEEROYJ in Splatoon 3.  

The data comes from reading the game's kill-feed banners off my capture card during live game play.

A python app watches the capture card and monitors for splat notifications to pop up. When it sees one, it captures a screenshot and tries to read the player's name. It can get pretty close, but it's not perfect. The special/foreign characters and ASCII art players put in there names can throw it off. 

For names that return a low confidence score, it puts them in a bucket for me to review. The admin shows the screenshot of the players name and allows for easy adjustments.

If someone changes their name, like Jim is J1M and J1MB0, I can group them all as a single player and combines their stats.

The admin exports the data to be published on the Splatboard. 

The export directory is committed to a github repo, which generates a new build of the Splatboard. 

***[Click to view …LEEEEROYJ's Splatboard](https://leeeeeroyj.github.io/splatboard/)***

---
<br><br>
<sup>**Not affiliated with Nintendo** - Splatboard is a personal development project and is not affiliated with, endorsed by, or sponsored by Nintendo. Splatoon and Splatoon 3 are trademarks of Nintendo. Thanks [Cat with Monocle](https://catwithmonocle.com/news/2022/09/07/splatoon-3-pattern-version-2-wallpaper/) for the Splatboard background.</sup>

Made with 🫟 and 🤖 by …LEEEEROYJ
