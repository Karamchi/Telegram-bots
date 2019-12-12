const schedule = require('node-schedule')
const Telegraf = require('telegraf')
const fs = require('fs');

const bot = new Telegraf(process.env.TOKEN)
var GRUPO = -305320173
//var phase = 0
// 0 = No game
// 1 = Thinking word
// 2 = Playing
var pending = undefined
var definitions = {}
var progress = 0
var word = undefined
var thinker = undefined
var time = undefined
var acceptingAnswer = false
var awaiting = {}
var answers = {}
var burnt = new Set([])
var contacteando = undefined
var fulltimeout = undefined
var path = undefined
var phase = 0

var groups = {}

bot.start((ctx) => {
        ctx.reply('Welcome!')
    })

bot.on('new_chat_members', (ctx) => {
    if (ctx.message.new_chat_participant.id == 504979973) {
        bot.telegram.sendMessage(-258588711, "Added to group " + ctx.message.chat.id) //Test
        ctx.reply("Hi! This bot is currently on beta phase and can't be played on two groups at the same time, try starting a game to see if I'm busy")
    }
})

var toAscii = function(str) {
        return str.toLowerCase()
        .replace(/á/, 'a')
        .replace(/é/, 'e')
        .replace(/í/, 'i')
        .replace(/ó/, 'o')
        .replace(/ú/, 'u')
        .replace(/ü/, 'u')
        .replace(/¿/, '?')
        .replace(/\./, '')
}

bot.on('text', (ctx) => {
    path = process.cwd();
    var msgtext = toAscii(ctx.message.text)
    if (msgtext == "/help") {
      ctx.reply("Aprender a jugar al contacto es como pelar una naranja")
      ctx.reply("/about: Más información")
      ctx.reply("/help_game: Cómo jugar al contacto")
      ctx.reply("/help_bot: Cómo usar el bot para jugar al contacto")
    }
    if (msgtext == "/about") {
      ctx.reply("Bot by Espi el Neta")
      ctx.reply("Version 1.0.0 - June 2019")
      ctx.reply("Hosted for free in glitch.com")
    }
    if (msgtext.includes("/help_game")) {
      ctx.reply(["El objetivo del juego es encontrar una palabra",
      "La palabra la piensa un jugador al que vamos a llamar 'thinker' y dice la primera letra",
      "El resto de los jugadores tienen que decir **definiciones** de palabras que empiecen con esa letra",
      "Cuando uno de los jugadores cree que conoce la palabra que se corresponde con una definición, dice 'contacto'",
      "Ambos cuentan, 1, 2, 3 y dicen (a la vez) la palabra que están pensando",
      "Si dicen la misma palabra, el 'thinker' tiene que dar una letra más de la palabra que había pensado originalmente.",
      "Si el thinker dice la palabra definida en cualquier momento (o sea, antes o después del contacto), quema la palabra, que no se puede volver a usar",
      "El juego termina cuando alguien encuentra la palabra original, que no puede ser quemada. Cuando eso ocurre se puede jugar de vuelta, cambiando el thinker"
      ].join(".\n"))           
    }
    if (msgtext.includes("/help_bot")) {
      ctx.reply(["El bot es una especie de arbitro que permite jugar a este juego a distancia en un grupo de tg",
      "En vez de tener las palabras en la cabeza, los jugadores se las dicen por privado al bot, y él se encarga de reenviar lo que sea necesario al grupo",
      "Para mandar una definición, se manda primero la palabra, después la definición",
      "El comando /newgame inicia el juego",
      "El comando /contacto equivale a decir CONTACTO",
      "Sólo se puede tener una definición pendiente por vez, que es la última que se mandó",
      "Sólo el que manda /contacto debe adivinar la palabra definida, lo que diga el resto de los participantes es ignorado.",
      "Durante un contacto, no se pueden mandar definiciones",
      "Si se agrega una nueva letra, se invalidan todas las palabras a medio definir",
      "El bot tiene un timer que termina el juego con victoria del thinker si pasan 15 minutos",
      "Si dicen la misma palabra, el 'thinker' tiene que dar una letra más de la palabra que había pensado originalmente",
      "Normalmente, decir dos palabras de la misma familia es como decir la misma palabra. Esto es dificil de implementar en el bot, que por el momento sólo es plural-insensitive."
      ].join(".\n"))
    }
    else if (ctx.message.chat.type == "group") {
        saveRelation(ctx.message.from.id, ctx.message.chat.id)
    }
    else if (msgtext.includes("/force_end") && ctx.message.from.id == 160565993) {
        phase = 0
    }
    if (msgtext.includes("/newgame") && ctx.message.chat.type == "group") {
        if (ctx.message.chat.type == "group" && phase != 0 && ctx.message.chat.id != GRUPO) {
            ctx.reply("A game is already running in another group and this bot is too beta to handle that")
            return 1;
        }
    }
    switch(phase) {
      case 0:
        phase0(ctx, msgtext)
        break
      case 1:
        phase1(ctx, msgtext)
        break
      case 2:
        phase2(ctx, msgtext)
    }
    
})

var phase0 = function(ctx, msgtext) {
  if (msgtext.includes("/newgame") && ctx.message.chat.type == "group") {
      ctx.replyWithMarkdown("A new game has been started. Send me a word [privately](tg://user?id=504979973)")
      initGlobalVariables(ctx.message.chat.id)
      clearTimeout(fulltimeout)
      path = process.cwd();
      phase = 1
  }
}

var phase1 = function(ctx, msgtext) {
    if (ctx.message.chat.type != "group") {
        if (!isAlpha(msgtext)) {
          ctx.reply("Must be a single word with no symbols")
        } else {
          word = msgtext
          thinker = ctx.message.from.id
          fulltimeout = setTimeout(timeout, 900000)
          var s = mentionUser(ctx.message.from)
          sendMessageMD(GRUPO, s + " pensó una palabra con " + cap1(word.slice(0, 1)))
          ctx.reply("Word saved, the rest will try to guess it")
          phase = 2
        }
    }
}

var phase2 = function(ctx, msgtext) {
    if (msgtext.includes("/ff") && ctx.message.from.id == thinker) {
        sendMessageMD(GRUPO, "The thinker has ended the game. The word was *" + cap1(word) + "*")
        phase = 0
    }
    else if (msgtext.includes("/status")) {
        ctx.replyWithMarkdown("*"+cap1(word.slice(0, progress + 1))+"*")
    } else if (ctx.message.chat.type == "group") {
        groupMessage(ctx, msgtext)
    } else {
        privateMessage(ctx, msgtext)
    }
  
    
}

var privateMessage = function(ctx, msgtext) {
  if (/**/ ctx.message.from.id != thinker) {
        //Manda palabra a grupo
        if (ctx.message.from.id in awaiting) {
            if (eq(msgtext, awaiting[ctx.message.chat.id].text)) {
              ctx.reply("Mandá una definición que no sea igual a la palabra")
            } else if (time != null) {
              ctx.reply("Hay un contacto corriendo, si falla mandá de vuelta la definición")
            } else if (matchesAny(Array.from(burnt), awaiting[ctx.message.from.id].text)) {
              ctx.reply("La palabra ya fue quemada")
              delete awaiting[ctx.message.chat.id]
            } else {
              bot.telegram.forwardMessage(GRUPO, ctx.message.chat.id, ctx.message.message_id)
              answers = {}
              answers[awaiting[ctx.message.chat.id].text] = {from: ctx.message.chat.id, msgid: awaiting[ctx.message.chat.id].msgid}
              logToFile(""+ ctx.message.chat.id + ": " + awaiting[ctx.message.chat.id].text + "\n")
              delete awaiting[ctx.message.chat.id]
            } 
            //showButton(ctx, GRUPO)
            //hideButtonFor(ctx, GRUPO, [thinker, ctx.message.chat.id])
        } else {
            onWordSentToBot(ctx, msgtext)
        }
    }
}

var groupMessage = function(ctx, msgtext) {
    if (/**/ ctx.message.from.id == thinker) {
          if (eq(msgtext, word)) {
              //No se puede quemar la propia
          }
          else if (matchesAny(Object.keys(answers), msgtext)) {
              for (var key in answers) {
                logToFile("" + thinker + " burnt a word from " + answers[key].from + "\n")
              }
              answers = {}
              ctx.reply("Quemada")
              burnt.add(msgtext)
              acceptingAnswer = false
              time = undefined
              clearTimeout(pending)
          }
    }
    else if (!acceptingAnswer && eq(msgtext, word))  {
        //Mandaron la palabra al grupo
        ctx.replyWithSticker("CAADAQADYQEAAukKkgmrVOefUfmVIQI")
        phase = 0
    }
    else if (acceptingAnswer && ctx.message.from.id == contacteando) {
        contacteando = undefined
        time = undefined
        clearTimeout(pending)
        if (eq(msgtext, word)) {
            forwardAnswer()
            ctx.reply("Sí, era esa")
            phase = 0
        }
        else if (matchesAny(Object.keys(answers), msgtext)) { //&& answers[msgtext] != ctx.message.from.id
            onMatch(ctx, msgtext)
        } else {
            onNoMatch(ctx, msgtext)
        }
    }
    else if (msgtext.includes("/contacto") && time == null) {
        if (Object.keys(answers).length === 0) return;
        for (var key in answers) {
            if (answers[key].from == ctx.message.from.id) return;
            //Chequea que no esté haciendo contacto consigo mismo
        }
        time = 0
        var pending = setTimeout(secondElapsed, 1000)
        contacteando = ctx.message.from.id
    }
    
    else if (acceptingAnswer) {
        console.log("DEBUG: I am currently listening for answers")
    }
}


var initGlobalVariables = function(chatId) {
  GRUPO = chatId
  definitions = {}
  progress = 0
  word = undefined
  thinker = undefined
  time = undefined
  acceptingAnswer = false
  awaiting = {}
  answers = {}
  burnt = new Set([])
}

var secondElapsed = function() {
    if (time == undefined) return
    time += 1
    bot.telegram.sendMessage(GRUPO, time)
    if (time < 3)
        pending = setTimeout(secondElapsed, 1000)
    else {
        acceptingAnswer = true
        pending = setTimeout(writeAnswer, 5000)
    }
}

var writeAnswer = function() {
  if (time == undefined) return
  if (acceptingAnswer) {
      contacteando = undefined
      acceptingAnswer = false
      var key = forwardAnswer()
      if (eq(key, word)) {
          phase = 0
          bot.telegram.sendMessage(GRUPO, "Sí, era esa")
      } else {
          bot.telegram.sendMessage(GRUPO, "Tardaste mucho")
          setTimeout(nextLetter, 2000)
          burnt.add(key)
      }
      answers = {}
  }
  time = undefined
  clearTimeout(pending)
}

var onMatch = (ctx, msgtext) => {
  acceptingAnswer = false
  time = undefined
  progress += 1
  burnt.add(msgtext)
  var key = forwardAnswer()
  logToFile("Match entre P: " + answers[key].from + " A: " + ctx.message.from.id + "\n"); 
  setTimeout(nextLetter, 2000)
  answers = {}
  awaiting = {}
}

var onWordSentToBot = (ctx, msgtext) => {
  if (msgtext.slice(0, progress + 1) != word.slice(0, progress + 1)) {
    ctx.reply("Your word must match the current progress ("+ cap1(word.slice(0, progress + 1)) + ")")
  } else if (matchesAny(Array.from(burnt), msgtext)) {
    ctx.reply("That word is already burnt")
  } else if (!isAlpha(msgtext)) {
    ctx.reply("Must be a single word with no symbols")
  } else {
    awaiting[ctx.message.from.id] = {text: msgtext, msgid:ctx.message.message_id}
    ctx.reply("Cool, now send me the definition")
  }
}

var onNoMatch = (ctx, msgtext) => {
  acceptingAnswer = false
  time = undefined
  var key = forwardAnswer()
  logToFile("No match entre P: " + answers[key].from + " A: " + ctx.message.from.id + "\n"); 
  burnt.add(msgtext)
  burnt.add(key)
  if (eq(key, word)) {
      phase = 0
      bot.telegram.sendMessage(GRUPO, "Sí, era esa")
  } else {
      setTimeout(nextLetter, 2000)
  }
  answers = {}
}

var forwardAnswer = () => {
  for (var key in answers) {
      bot.telegram.forwardMessage(GRUPO, answers[key].from, answers[key].msgid)
      return key
  }
  return undefined
}

var nextLetter = () => {
  sendMessageMD(GRUPO, "*"+cap1(word.slice(0, progress + 1))+"*")
  if (word == word.slice(0, progress + 1)) {
      bot.telegram.sendMessage(GRUPO, "Bueno, es esa")
      phase = 0
  }
}

var mentionUser = (user) => {
  if (user.username)
      return "@" + user.username
  return "[" + user.first_name + "](tg://user?id=" + user.id + ")"
}

var sendMessageDelay = (text, delay) => {
    setTimeout(() => bot.telegram.sendMessage(GRUPO, text), delay)
}

var sendMessageMD = (chat, text) => {
  bot.telegram.sendMessage(chat, text, {parse_mode:"Markdown"})
}

var timeout = () => {
    if (phase == 2)
      sendMessageMD(GRUPO, "Se acabó el tiempo! El [thinker](tg://user?id=" + thinker + ") ganó. La palabra era *" + cap1(word) + "*")
    phase = 0
}
                           
var cap1 = (string) => {
  return string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)
}

var logToFile = (string) => {
  fs.appendFile(path + "/record.txt", string, function(err) {}); 
}

var matchesAny = function(array, string) {
  return array.some((elem) => eq(elem, string))
}

const isAlpha = ch => {
	return ch.match(/^[a-zñáéíóúü]+$/i) !== null && ch.length >= 2;
}

var eq = function(string1, string2) {
  return eqasim(string1, string2) || eqasim(string2, string1)
}

var eqasim = function(string1, string2) {
  return string1 == string2
    || string1 == string2 + "s"
    || string1 == string2 + "es"
    || string1 == string2 + "ante"
    || string1 == string2 + "r"
    || string1.slice(0, string1.length-1) == string2 + "ante";
}

var saveRelation = (idperson, idchat) => {
    var buffer = fs.readFileSync(path + "/groups.txt");
    groups = JSON.parse(buffer)
    if (idperson in groups) {
      if (groups[idperson].indexOf(idchat) == -1) {
        groups[idperson].push(idchat)
      }
    } else {
      groups[idperson] = [idchat]
    }
    
    fs.writeFile(path + "/groups.txt", JSON.stringify(groups), function(err) {});
}

bot.startPolling()

const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);