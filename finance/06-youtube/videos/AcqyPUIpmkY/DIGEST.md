<!-- voice-ignore-file: transcript-derived digest -->
# Algorithmic Trading Bot Army with Freqtrade (2026) | Kuldeep Singh Rathore | AI Trading Automation | AcqyPUIpmkY | 0.32 h

Teaches: Kuldeep Singh Rathore (2026) demos a Docker dashboard that deploys many Freqtrade bots from a strategy catalog, each on its own port. Promotional for his school community.

Claims:
- The dashboard deploys each catalog strategy as a separate Freqtrade container on its own port, for example Ichimoku V30 on port 9136, visible with a local container listing. "deployed Ichimoku V30 1-day futures on the port 9136" [0:06:07]
- The catalog is sortable by Sharpe, but results come from historical data, so he advises a dry run for at least a month before any live deployment. "do your own dry run for at least a month" [0:04:26]
- The app runs on Windows, a Mac Mini, Linux, a Raspberry Pi or cloud, and installs by one script that downloads the images in a few minutes. "it will download all the images in the background" [0:13:02]
- The default admin password is set in the .env file and should be changed outside local testing. "you can go to your .env file and you can change" [0:13:33]

Architecture: Docker-based bot army: dashboard, strategy catalog, one Freqtrade container per strategy with dry-run default.

Worked:
- none reported

Failed:
- none reported
