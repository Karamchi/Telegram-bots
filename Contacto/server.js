const schedule = require('node-schedule')
const Telegraf = require('telegraf')
const fs = require('fs');
var groups = {}

const bot = new Telegraf(process.env.TOKEN)
//var GRUPO = -305320173
//var phase = 0
// 0 = No game
// 1 = Thinking word
// 2 = Playing
var status = {}
//var path = undefined
//answers: para cada definición, quién la mandó y el id para reenviar
//awaiting: para cada persona que mandó una palabra y no la definición, la palabra que mandó y el id para reenviar

bot.start((ctx) => {
        ctx.reply('Welcome!')
    })

bot.on('new_chat_members', (ctx) => {
    if (ctx.message.new_chat_participant.id == 504979973) {
        bot.telegram.sendMessage(-258588711, "Added to group " + ctx.message.chat.id) //Test
        ctx.reply("Hi! use /newgame to start a new game or /help to learn how to use me")
    } else {
        saveRelation(ctx.message.new_chat_participant.id, ctx.message.chat.id)
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
    //console.log(ctx.message.chat)
    //path = process.cwd();
    //console.log(ctx.message)
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
      ctx.replyWithMarkdown(["El objetivo del juego es encontrar una palabra",
      "La palabra la piensa un jugador al que vamos a llamar 'thinker' y dice la primera letra",
      "El resto de los jugadores tienen que decir *definiciones* de palabras que empiecen con esa letra",
      "Cuando uno de los jugadores cree que conoce la palabra que se corresponde con una definición, dice 'contacto'",
      "Ambos cuentan, 1, 2, 3 y dicen (a la vez) la palabra que están pensando",
      "Si dicen la misma palabra, el 'thinker' tiene que dar una letra más de la palabra que había pensado originalmente.",
      "Si el thinker dice la palabra definida en cualquier momento (o sea, antes o después del contacto), quema la palabra, que no se puede volver a usar",
      "El juego termina cuando alguien encuentra la palabra original, que no puede ser quemada. Cuando eso ocurre se puede jugar de vuelta, cambiando el thinker"
      ].join(".\n"))           
    }
    if (msgtext.includes("/help_bot")) {
      ctx.replyWithMarkdown(["El bot es una especie de arbitro que permite jugar a este juego a distancia en un grupo de tg",
      "En vez de tener las palabras en la cabeza, los jugadores se las dicen por privado al bot, y él se encarga de reenviar lo que sea necesario al grupo",
      "Para mandar una definición, se manda primero la palabra, después la definición",
      "El comando /newgame inicia el juego",
      "El comando /contacto equivale a decir CONTACTO",
      "Sólo se puede tener una definición pendiente por vez, que es la última que se mandó",
      "Sólo el que manda /contacto debe adivinar la palabra definida, lo que diga el resto de los participantes es ignorado.",
      "Durante un contacto, no se pueden mandar definiciones",
      "Si se agrega una nueva letra, se invalidan todas las palabras a medio definir",
      "El bot tiene un timer que termina el juego con victoria del thinker si pasan 15 minutos",
      "Normalmente, decir dos palabras de la misma familia es como decir la misma palabra. Esto es dificil de implementar en el bot, que por el momento sólo es plural-insensitive.",
      "El bot soporta hasta un juego _activo_ por usuario. Si el mismo usuario está en más de un grupo que está jugando a la vez, no puede mandar mensajes privados al bot, ya que no está implementado cómo saber a qué juego reenviarlos."
      ].join(".\n"))
    }
  
    if (Object.keys(status).length == 0) {
      restore()
    }
    
    var GRUPO = undefined
    if (ctx.message.chat.type != "private") {
      saveRelation(ctx.message.from.id, ctx.message.chat.id)
      GRUPO = ctx.message.chat.id
      //console.log(!GRUPO in status)
    } else {
      var ag = activeGroups(ctx.message.from.id)
      if (ag.length == 0) {
        return
      } else if (ag.length == 1) {
        GRUPO = ag[0]
      } else {
        ctx.reply("There is more than one active group for your user")
        return
      }
    }
    
    if (msgtext.includes("/force_end") && ctx.message.from.id == 160565993) {
        status[GRUPO].phase = 0
    }
    if (msgtext.includes("/clean_status") && ctx.message.from.id == 160565993) {
        status = {}
    }
    if (msgtext.includes("/newgame") && ctx.message.chat.type != "private") {
        if (!(GRUPO in status) || status[GRUPO].phase == 0) {
          status[GRUPO] = new juego(GRUPO)
        }
        
        /*if (ctx.message.chat.type == "group" && status[GRUPO].phase != 0 && ctx.message.chat.id != GRUPO) {
            ctx.reply("A game is already running in another group and this bot is too beta to handle that")
            return 1;
        }*/
       }
 
    if (!(GRUPO in status)) {
      return
    } 
  
    switch(status[GRUPO].phase) {
      case 0:
        status[GRUPO].phase0(ctx, msgtext)
        break
      case 1:
        status[GRUPO].phase1(ctx, msgtext)
        break
      case 2:
        status[GRUPO].phase2(ctx, msgtext)
    }
  
    save()
})

class juego {
  
constructor(groupid) {
  this.phase = 0

  this.pending = undefined
  this.definitions = {}
  this.progress = 0
  this.word = undefined
  this.thinker = undefined
  this.time = undefined
  this.acceptingAnswer = false
  this.awaiting = {}
  this.answers = []
  this.burnt = new Set([])
  this.contacteando = undefined
  this.fulltimeout = undefined
  this.GRUPO = groupid
}
  
phase0(ctx, msgtext) {
  if (msgtext.includes("/newgame") && ctx.message.chat.type != "private") {
      ctx.replyWithMarkdown("A new game has been started. Send me a word [privately](tg://user?id=504979973)")
      this.GRUPO = ctx.message.chat.id
      clearTimeout(this.fulltimeout)
      this.phase = 1
  }
}

phase1(ctx, msgtext) {
    if (ctx.message.chat.type == "private") {
        if (!isAlpha(msgtext)) {
          ctx.reply("Must be a single word with no symbols")
        } else if (msgtext.match("^(super|inter|anti).*")) {
          ctx.reply("Sin prefijos porfa")
        } else {
          this.word = msgtext
          this.thinker = ctx.message.from.id
          //this.fulltimeout = setTimeout(this.timeout.bind(this), 960000)
          this.currentTime = new Date()
          var s = mentionUser(ctx.message.from)
          sendMessageMD(this.GRUPO, s + " pensó una palabra con " + cap1(this.word.slice(0, 1)))
          ctx.reply("Word saved, the rest will try to guess it")
          this.phase = 2
          this.participants = new Set([])
        }
    }
}

phase2(ctx, msgtext) {
    if (msgtext.includes("/ff") && ctx.message.from.id == this.thinker) {
        sendMessageMD(this.GRUPO, "The thinker has ended the game. The word was *" + this.word + "*")
        this.win()
    }
    else if (msgtext.includes("/status")) {
        ctx.replyWithMarkdown("*"+cap1(this.word.slice(0, this.progress + 1))+ "*")
    } else if (ctx.message.chat.type != "private") {
        this.groupMessage(ctx, msgtext)
    } else {
        //console.log(this)
        this.privateMessage(ctx, msgtext)
    }
  
    
}

privateMessage(ctx, msgtext) {
  //console.log(this)
  if (/* */ ctx.message.from.id != this.thinker) {
        //Manda palabra a grupo
        if (ctx.message.from.id in this.awaiting) {
            if (eq(msgtext, this.awaiting[ctx.message.chat.id].text)) {
              ctx.reply("La palabra no puede ser igual a la definición")
            } else if (this.time != null) {
              ctx.reply("Hay un contacto corriendo, si falla mandá de vuelta la definición")
            } else if (matchesAny(Array.from(this.burnt), this.awaiting[ctx.message.from.id].text)) {
              ctx.reply("La palabra ya fue quemada")
              delete this.awaiting[ctx.message.chat.id]
            } else if (msgtext.includes("/cancel")) {
              delete this.awaiting[ctx.message.chat.id]
            } else {
              bot.telegram.forwardMessage(this.GRUPO, ctx.message.chat.id, ctx.message.message_id)
              logToFile(""+ ctx.message.chat.id + ": " + this.awaiting[ctx.message.chat.id].text + "\n")
              //this.answers = []
              this.answers.unshift({text: this.awaiting[ctx.message.chat.id].text,
                                    from: ctx.message.chat.id, 
                                    msgid: this.awaiting[ctx.message.chat.id].msgid,
                                    defid: ctx.message.message_id})
              delete this.awaiting[ctx.message.chat.id]
              this.newParticipant(ctx.message.from.id)
            } 
            //showButton(ctx, GRUPO)
            //hideButtonFor(ctx, GRUPO, [thinker, ctx.message.chat.id])
        } else {
            //console.log(this)
            this.onWordSentToBot(ctx, msgtext)
        }
    }
}

groupMessage(ctx, msgtext) {
    if (ctx.message.from.id == this.thinker) {
          //console.log(this.answers)
          if (eq(msgtext, this.word)) {
              //No se puede quemar la propia
          }
          else if (this.answers.length > 0 && eq(this.answers[0].text, msgtext)) {
              logToFile("" + this.thinker + " burnt a word from " + this.answers[0].from + "\n")
              //this.answers.shift()
              ctx.reply("Quemada")
              this.burnt.add(msgtext)
              this.acceptingAnswer = false
              this.time = undefined
              clearTimeout(pending)
              setTimeout(this.onBurnOrNoMatch.bind(this), 1500)
              this.answers.shift()
              console.log(this.answers)
          }
    }
    else if (!this.acceptingAnswer && eq(msgtext, this.word))  {
        //Mandaron la palabra al grupo
        ctx.replyWithSticker("CAADAQADYQEAAukKkgmrVOefUfmVIQI")
        this.win()
    }
    else if (this.acceptingAnswer && ctx.message.from.id == this.contacteando) {
        this.contacteando = undefined
        this.time = undefined
        clearTimeout(pending)
        if (eq(msgtext, this.word)) {
            this.forwardAnswer()
            ctx.reply("Sí, era esa")
            this.win()
        }
        else if (eq(msgtext, this.answers[0].text)) { //&& answers[msgtext] != ctx.message.from.id
            this.onMatch(ctx, msgtext)
        } else {
            this.onNoMatch(ctx, msgtext)
        }
    }
    else if (msgtext.includes("/contacto") && this.time == null) {
        if (this.answers.length === 0) return;
        if (this.answers[0].from == ctx.message.from.id) return;
            //Chequea que no esté haciendo contacto consigo mismo
        this.time = 0
        var pending = setTimeout(this.secondElapsed.bind(this), 1000)
        this.contacteando = ctx.message.from.id
        this.newParticipant(ctx.message.from.id)
    }
    
    else if (this.acceptingAnswer) {
        console.log("DEBUG: I am currently listening for answers")
    }
}

secondElapsed() {
    console.log("SE")
    console.log(this.answers)
    if (this.time == undefined) return
    this.time += 1
    bot.telegram.sendMessage(this.GRUPO, this.time)
    if (this.time < 3)
        this.pending = setTimeout(this.secondElapsed.bind(this), 1000)
    else {
        this.acceptingAnswer = true
        this.pending = setTimeout(this.writeAnswer.bind(this), 5000)
    }
}

writeAnswer() {
  console.log("WA")
  console.log(this.answers)
  if (this.time == undefined) return
  clearTimeout(this.pending)
  if (this.acceptingAnswer) {
      this.contacteando = undefined
      this.acceptingAnswer = false
      this.forwardAnswer()
      var key = this.answers[0].text
      if (eq(key, this.word)) {
          this.win()
          bot.telegram.sendMessage(this.GRUPO, "Sí, era esa")
      } else {
          bot.telegram.sendMessage(this.GRUPO, "Tardaste mucho")
          setTimeout(this.onBurnOrNoMatch.bind(this), 1500)
          console.log(this.answers)
          this.answers.shift()
          this.burnt.add(key)
      }
  }
}

onMatch(ctx, msgtext) {
  this.acceptingAnswer = false
  this.time = undefined
  this.progress += 1
  this.burnt.add(msgtext)
  this.forwardAnswer()
  logToFile("Match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n"); 
  setTimeout(this.nextLetter.bind(this), 1500)
  this.answers = []
  this.awaiting = {}
}

onWordSentToBot(ctx, msgtext) {
  //console.log(this)
  if (msgtext.slice(0, this.progress + 1) != this.word.slice(0, this.progress + 1)) {
    ctx.reply("Your word must match the current progress ("+ cap1(this.word.slice(0, this.progress + 1)) + ")")
  } else if (matchesAny(Array.from(this.burnt), msgtext)) {
    ctx.reply("That word is already burnt")
  } else if (!isAlpha(msgtext)) {
    ctx.reply("Must be a single word with no symbols")
  } else {
    this.awaiting[ctx.message.from.id] = {text: msgtext, msgid:ctx.message.message_id}
    ctx.reply("Cool, now send me the definition, or /cancel to be able to send a different word")
  }
}

onNoMatch(ctx, msgtext) {
  this.acceptingAnswer = false
  this.forwardAnswer()
  var key = this.answers[0].text
  logToFile("No match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n"); 
  this.burnt.add(msgtext)
  this.burnt.add(key)
  if (eq(key, this.word)) {
      this.win()
      bot.telegram.sendMessage(this.GRUPO, "Sí, era esa")
  } else {
      setTimeout(this.onBurnOrNoMatch.bind(this), 1500)
      this.answers.shift()
      console.log(this.answers)
  }
  //this.answers.shift()
  //setTimeout(this..bind(this), 1500)
}
  
onBurnOrNoMatch() {
  this.time = undefined
  if (this.answers.length == 0) {
    this.nextLetter()
  } else {
    bot.telegram.forwardMessage(this.GRUPO, this.answers[0].from, this.answers[0].defid)
  }
}

forwardAnswer() {
  bot.telegram.forwardMessage(this.GRUPO, this.answers[0].from, this.answers[0].msgid)
}

nextLetter() {
  sendMessageMD(this.GRUPO, "*" + cap1(this.word.slice(0, this.progress + 1)) + "*")
  if (this.word == this.word.slice(0, this.progress + 1)) {
      bot.telegram.sendMessage(this.GRUPO, "Bueno, es esa")
      this.win()
  }
}

sendMessageDelay (text, delay) {
    setTimeout(bot.telegram.sendMessage(this.GRUPO, text).bind(this), delay)
}
  
newParticipant(id) {
  var prevSize = this.participants.size
  this.participants.add(id)
  if (prevSize == 1 && this.participants.size > 1) {
      this.fulltimeout = setTimeout(this.timeout.bind(this), 960000)
      bot.telegram.sendMessage(-258588711, "Timer started")
      this.currentTime = new Date()
  }
}

timeout() {
    if (this.phase == 2) {
      sendMessageMD(this.GRUPO, "Se acabó el tiempo! El [thinker](tg://user?id=" + this.thinker + ") ganó. La palabra era *" + cap1(this.word) + "*")
      clearTimeout(this.pending)
      this.time == undefined
    }
    this.phase = 0
    save()
}
  
win() {
  var s = "" + 60*16 - parseInt((new Date() - this.currentTime) / 1000) + " segundos"
  bot.telegram.sendMessage(this.GRUPO, "Tiempo restante: " + s)
  this.phase = 0
}

}

var save = () => {
  var status2 = {}
  for (var grupo in status) {
    status2[grupo] = new juego(grupo)
    status2[grupo].word = status[grupo].word,
    status2[grupo].progress = status[grupo].progress,
    status2[grupo].burnt = Array.from(status[grupo].burnt),
    status2[grupo].thinker = status[grupo].thinker,
    status2[grupo].phase = status[grupo].phase
  }
  console.log(status2)
  fs.writeFile("./status.txt", JSON.stringify(status2), function(err) {});
}

var restore = () => {
  var buffer = fs.readFileSync("./status.txt", 'utf8');
  console.log(buffer)
  try {
    var status2 = JSON.parse(buffer)
    for (var grupo in status2) {
      if (status2[grupo].phase == 2) {
        status[grupo] = new juego(grupo)
        status[grupo].word = status2[grupo].word,
        status[grupo].progress = status2[grupo].progress,
        status[grupo].burnt = new Set(status2[grupo].burnt),
        status[grupo].currentTime = new Date(),
        status[grupo].thinker = status2[grupo].thinker,
        status[grupo].phase = status2[grupo].phase
        status[grupo].fulltimeout = setTimeout(status[grupo].timeout.bind(status[grupo]), 16*60*1000)
        bot.telegram.sendMessage(-258588711, "Game restored")
      }
    }
  } catch (error) {
    console.log("Error leyendo status")
  }
}

var mentionUser = (user) => {
  if (user.username)
      return "@" + user.username
  return "[" + user.first_name + "](tg://user?id=" + user.id + ")"
}

var sendMessageMD = (chat, text) => {
  bot.telegram.sendMessage(chat, text, {parse_mode:"Markdown"})
}
                           
var cap1 = (string) => {
  return string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)
}

var logToFile = (string) => {
  fs.appendFile("./record.txt", string, function(err) {}); 
}

var matchesAny = function(array, string) {
  return array.some((elem) => eq(elem, string))
}

const isAlpha = ch => {
  for (var i = 2; i < ch.length; i++) {
      if (ch.charAt(i) == ch.charAt(i - 1) && ch.charAt(i) == ch.charAt(i - 2)) {
        return false
      }
  }
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
  var buffer = fs.readFileSync("./groups.txt", 'utf8');
  console.log(buffer)
  try {
    groups = JSON.parse(buffer)
    if (idperson in groups) {
      if (groups[idperson].indexOf(idchat) == -1) {
        groups[idperson].push(idchat)
      }
    } else {
      groups[idperson] = [idchat]
    } 
    fs.writeFile("./groups.txt", JSON.stringify(groups), function(err) {});
  } catch (error) {
    console.log("Error leyendo grupos")
  }
}

bot.on('left_chat_member', (ctx) => {
    //path = process.cwd();
    var buffer = fs.readFileSync("./groups.txt", "utf8");
    groups = JSON.parse(buffer)
    var left = ctx.message.left_chat_participant.id
    if (left == 504979973)
      for (var key in groups) {
        rmRelation(key, ctx.message.chat.id)
      }
    else
      rmRelation(left, ctx.message.chat.id)
    fs.writeFile("./groups.txt", JSON.stringify(groups), function(err) {});
})

var rmRelation = (idperson, idchat) => {
    if (idperson in groups) {
      var index = groups[idperson].indexOf(idchat)
      if (index != -1) {
        groups[idperson].splice(index, 1)
      }
    } 
}

var activeGroups = (idperson) => {
    if (idperson in groups)
      return Array.from(groups[idperson]).filter((g) => g in status && status[g].phase > 0)
    else return []
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