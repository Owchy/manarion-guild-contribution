# manarion-guild-contribution
Compiles the contributions made by guild members and allows them to be seen on the screen and exported to CSV. 

# Manarion Contributions Log

A [Tampermonkey](https://www.tampermonkey.net/) userscript for the browser-based idle game [Manarion](https://manarion.com), designed to fetch and log **total contributions** from each guild member.

## 🧾 What It Does

- ✅ Adds a **“Fetch Guild Contributions”** button to the guild page
- 🔄 Loops through all visible guild members
- 📊 Collects data from each member’s **“Contributions”** modal
- 📋 Logs each member's totals to the browser console

## 📦 Contribution Categories

The script automatically collects and logs:

- 🟪 Mana Dust  
- 🟧 Elemental Shards  
- 📘 Codex  
- 🐟 Fish  
- 🌲 Wood  
- ⛏ Iron  
- ⚔ Battle XP  

Example Output:

✅ (Username) Contributions:
- Mana Dust: 447429836446
- Elemental Shards: 5132979546
- Codex: 836
- Fish: 17637961736
- Wood: 5514480
- Iron: 5902901
- Battle XP: 7512765161


## 🚀 Installation

1. Install [Tampermonkey](https://tampermonkey.net/) browser extension.
2. Click [here to install the script](https://github.com/Owchy/manarion-contributions-log/raw/main/manarion-contributions-log.user.js).
3. Go to your [Guild page](https://manarion.com/guild).
4. Click **“Fetch Guild Contributions”** in the top-right corner.
5. View the full report in your **browser console** (`F12 > Console`).

## 📌 Notes

- It requires the guild member list to be fully loaded before use.

## 🛡 Disclaimer

This script performs read-only operations and does not alter any game data. Use responsibly and in accordance with the game's terms of service.

## 🧩 Optional Enhancements (PRs Welcome!)

- UI overlay with a sortable table
- CSV export
- Leaderboard-style contributor summaries
- Filtering or threshold highlights

---

**Enjoy simplifying your guild management!**
