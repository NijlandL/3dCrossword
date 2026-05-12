// chat.js — standalone RiveScript helper
// The chatbot logic is already wired into sketch.js.
// This file shows the pattern as a reusable module if you ever
// want to move the bot out of sketch.js.

class ChatBot {
  constructor() {
    this.bot = new RiveScript();
    this.ready = false;
  }

  // Call this once, then use reply() after the promise resolves
  load(brainFile) {
    return this.bot.loadFile(brainFile).then(() => {
      this.bot.sortReplies();
      this.ready = true;
    });
  }

  async reply(message) {
    if (!this.ready) return "Bot is still loading...";
    return await this.bot.reply("local-user", message.toLowerCase());
  }
}

// Usage example (not active — bot is already set up in sketch.js):
//
//   const chat = new ChatBot();
//   chat.load("brain.txt").then(() => {
//     chat.reply("row 1").then(response => console.log(response));
//   });
