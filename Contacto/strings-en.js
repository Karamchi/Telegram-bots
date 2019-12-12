var strings = {};

module.exports = strings;

strings.start = 'Welcome!'
strings.hello = "Hi! use /newgame to start a new game or /help to learn how to use me"

strings.about = [
  "Bot by Espi el Neta",
  "Version 1.0.0 - June 2019",
  "Hosted for free in glitch.com"
]

strings.help_game = [
  "The goal of the game is to find a word",
  "A player, whom we will call 'thinker', will think this word and say the first letter",
  "The other players now have to think and say *definitions* of words starting with that letter",
  "When any of the players believes he knows the word that matches a certain definitionhe can say 'contacto'",
  "Both count to 3 and say (at the same time) the word they're thinking of",
  "If they say the same word, the 'thinker' has to tell the players the next letter of the word he had thought at the beginning of the game.",
  "However, if the thinker says a word with a pending definition at any point (whether before or during the contacto), they burn the word, which cannot be used again",
  "The game ends when someone says the original word, which cannot be burnt. When that happen, the game can start again, with a different thinker"
]

strings.help_bot = [
  "This bot is a referee of sorts, making it possible to play this game through a tg group",
  "Instead of just thinking words, players will say them to the bot's chat, and he will take care of forwarding to the group whatever is neccessary",
  "To send a definition, send the word first, then the definition",
  "/newgame starts the game",
  "/contacto will start a contacto between two players",
  "Only one definition ccan be pending at the same time: the last one sent",
  "Only the player that sends /contacto can guess a definition. Other players will be ignored.",
  "During a contacto, no definitions will be forwarded",
  "When a new letter is discovered, all words sent to the bot wihout a definition will be removed",
  "This bot features a timer, which will end the game with a thinker's victory after 16 minutes",
  "Usually, saying two words of the same family is like saying the same word. This is hard to implement, so the bot is only plural-insensitive.",
  "This bot supports up to one _activo_ game per user. If the same user is in more than one group with an active game, he can't send private messages to the bot, since it is not trivial to know which group this messages correspond to."
]

strings.help = [
  "/about: More information",
  "/help_game: How to play contacto",
  "/help_bot: How to use this bot to play contacto"
]

strings.error_groups = "There is more than one active group for your user"

strings.phase0 = "A new game has been started. Send me a word [privately](tg://user?id=504979973)"

strings.phase1_prefixes = "No prefixes please"
strings.phase1_reply = "Word saved, the rest will try to guess it"
strings.phase1_forward = (s, word) => s + " has though a word starting with " + cap1(word.slice(0, 1))

strings.error_not_alpha = "Must be a single word with no symbols"

strings.phase2_ff = word => "The thinker has ended the game. The word was *" + word + "*"
strings.phase2_private_ok = "Cool, now send me the definition, or /cancel to be able to send a different word"
strings.phase2_private_error_same_word = "La palabra no puede ser igual a la definición"
strings.phase2_private_error_contacto_corriendo = "Hay un contacto corriendo, si falla mandá de vuelta la definición"
strings.phase2_private_error_burnt = "That word is already burnt"
strings.phase2_public_burnt = "Burnt"
strings.phase2_public_win = "Yep, that was the word"
strings.phase2_public_win_2 = "Alright, that was the word"
strings.phase2_public_contacto_tardo = "You took too long"
strings.phase2_public_timeout = (thinker, word) => "Time over! The [thinker](tg://user?id=" + thinker + ") wins. The word was *" + cap1(word) + "*"

strings.phase2_private_error_match_progress = (word, progress) => "Your word must match the current progress ("+ cap1(word.slice(0, progress + 1)) + ")"

var cap1 = (string) =>
  string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)
