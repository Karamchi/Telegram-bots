const schedule = require('node-schedule')
const Telegraf = require('telegraf')
const fs = require('fs');
const msg = require('./sendMessage')
const gm = require('./groups');
const su = require('./stringUtils');
const strings = require('./strings-es');
const TOTAL_TIME = 16*60

const bot = new Telegraf(process.env.TOKEN)
msg.setBot(bot)
//var GRUPO = -305320173
//var phase = 0
// 0 = No game
// 1 = Thinking word
// 2 = Playing
var status = {}
//answers: para cada definición, quién la mandó y el id para reenviar
//awaiting: para cada persona que mandó una palabra y no la definición, la palabra que mandó y el id para reenviar

bot.start((ctx) => {
        ctx.reply('Welcome!')
    })

bot.on('new_chat_members', (ctx) => {
    gm.onNewChatMembers(ctx)
    if (ctx.message.new_chat_participant.id == 504979973) {
        bot.telegram.sendMessage(-258588711, "Added to group " + ctx.message.chat.id) //Test
        ctx.reply("Hi! use /newgame to start a new game or /help to learn how to use me")
    }     
})

bot.hears('/about', (ctx) => {
  reply(ctx, "Bot by Espi el Neta")
  reply(ctx, "Version 1.0.0 - June 2019")
  reply(ctx, "Hosted for free in glitch.com")
})

bot.hears('/help_game', (ctx) => {
  reply(ctx, strings.help_game.join(".\n"))
})

bot.hears('/help_bot', (ctx) => {
  reply(ctx, strings.help_bot.join(".\n"))
})

bot.hears(['/help','/help@contact_game_bot'], (ctx) => {
  reply(ctx, "Aprender a jugar al contacto es como pelar una naranja")
  reply(ctx, "/about: Más información")
  reply(ctx, "/help_game: Cómo jugar al contacto")
  reply(ctx, "/help_bot: Cómo usar el bot para jugar al contacto")
})

bot.on('text', (ctx) => {
    var msgtext = su.toAscii(ctx.message.text)
  
    if (Object.keys(status).length == 0) 
      restore()
    
    var GRUPO = undefined
    if (ctx.message.chat.type != "private") {
      gm.saveRelation(ctx.message.from.id, ctx.message.chat.id)
      GRUPO = ctx.message.chat.id
      //console.log(!GRUPO in status)
    } else {
      var ag = activeGroups(ctx.message.from.id)
      if (ag.length == 0) {
        return
      } else if (ag.length == 1) {
        GRUPO = ag[0]
      } else {
        reply(ctx, "There is more than one active group for your user")
        return
      }
    }
    
    if (msgtext.includes("/force_end") && ctx.message.from.id == 160565993) {
        delete status[GRUPO].state
    }
    if (msgtext.includes("/newgame") && ctx.message.chat.type != "private") {
        if (!(GRUPO in status)) {
          status[GRUPO] = new Statecontext(new phase0(GRUPO))
        }
        /*
        if (ctx.message.chat.type == "group" && status[GRUPO].phase != 0 && ctx.message.chat.id != GRUPO) {
            ctx.reply("A game is already running in another group and this bot is too beta to handle that")
            return 1;
        }*/
       }
   
    if (!(GRUPO in status))
      return
  
    if (ctx.message.chat.type != "private") {
      status[GRUPO].state.handlePublicMsg(ctx, msgtext)
    } else {
      status[GRUPO].state.handlePrivateMsg(ctx, msgtext)
    }
    save()
    
})

class Statecontext {
  constructor(state) {
    this.state = state
    this.state.statecontext = this
  }
}

class juego {
  
  constructor(groupid, statecontext) {
    this.statecontext = statecontext
    this.GRUPO = groupid
  }
  
  handlePrivateMsg(ctx, msgtext){}
  handlePublicMsg(ctx, msgtext){}
}

class phase0 extends juego {
  
  handlePublicMsg(ctx, msgtext){
    if (msgtext.includes("/newgame")) {
        reply(ctx, "A new game has been started. Send me a word [privately](tg://user?id=504979973)")
        this.GRUPO = ctx.message.chat.id
        clearTimeout(this.fulltimeout)
        this.statecontext.state = new phase1(this.GRUPO, this.statecontext)
    }
  }
}

class phase1 extends juego {
  handlePrivateMsg(ctx, msgtext){
    if (!isAlpha(msgtext)) {
      reply(ctx, "Must be a single word with no symbols")
    } else {
      var s = su.mentionUser(ctx.message.from)
      sendMessage(this.GRUPO, s + " pensó una palabra con *" + cap1(msgtext.slice(0, 1)) + "*")
      reply(ctx, "Word saved, the rest will try to guess it")
      this.statecontext.state = new phase2(this.GRUPO, this.statecontext, msgtext, ctx.message.from.id)
    }
  }
}

class phase2 extends juego {
  
  constructor(groupid, statecontext, word, thinker) {
    super(groupid, statecontext)

    this.definitions = {}
    this.progress = 0
    this.word = word
    this.thinker = thinker
    this.acceptingAnswer = false
    this.awaiting = {}
    this.answers = []
    this.burnt = new Set([])
    this.fulltimeout = setTimeout(this.timeout.bind(this), 900000)
    this.currentTime = new Date()
  }
  
general(ctx, msgtext) {
    if (msgtext.includes("/ff") && ctx.message.from.id == this.thinker) {
        sendMessage(this.GRUPO, "The thinker has ended the game. The word was *" + this.word + "*")
        delete this.statecontext.state
    }
    else if (msgtext.includes("/status")) {
        reply(ctx, "*"+cap1(this.word.slice(0, this.progress + 1))+ "*")
    }
}
  
  
handlePrivateMsg(ctx, msgtext) {
  //console.log(this)
  this.general(ctx, msgtext)
  if (ctx.message.from.id != this.thinker) {
        //Manda palabra a grupo
        if (ctx.message.from.id in this.awaiting) {
            if (eq(msgtext, this.awaiting[ctx.message.chat.id].text)) {
              reply(ctx, "La palabra no puede ser igual a la definición")
            } else if (this.time != null) {
              reply(ctx, "Hay un contacto corriendo, si falla mandá de vuelta la definición")
            } else if (matchesAny(Array.from(this.burnt), this.awaiting[ctx.message.from.id].text)) {
              reply(ctx, "La palabra ya fue quemada")
              delete this.awaiting[ctx.message.chat.id]
            } else if (msgtext.includes("/cancel")) {
              delete this.awaiting[ctx.message.chat.id]
            } else {
              this.answers.unshift({text: this.awaiting[ctx.message.chat.id].text,
                                    from: ctx.message.chat.id, 
                                    msgid: this.awaiting[ctx.message.chat.id].msgid,
                                    defid: ctx.message.message_id})
              this.front()
              delete this.awaiting[ctx.message.chat.id]
            } 
            //showButton(ctx, GRUPO)
            //hideButtonFor(ctx, GRUPO, [thinker, ctx.message.chat.id])
        } else {
            //console.log(this)
            this.onWordSentToBot(ctx, msgtext)
        }
    }
}
  
onWordSentToBot(ctx, msgtext) {
  //console.log(this)
  if (msgtext.slice(0, this.progress + 1) != this.word.slice(0, this.progress + 1)) {
    reply(ctx, "Your word must match the current progress ("+ cap1(this.word.slice(0, this.progress + 1)) + ")")
  } else if (matchesAny(Array.from(this.burnt), msgtext)) {
    reply(ctx, "That word is already burnt")
  } else if (!isAlpha(msgtext)) {
    reply(ctx, "Must be a single word with no symbols")
  } else {
    this.awaiting[ctx.message.from.id] = {text: msgtext, msgid:ctx.message.message_id}
    reply(ctx, "Cool, now send me the definition, or /cancel to be able to send a different word")
  }
}

handlePublicMsg(ctx, msgtext) {
    this.general(ctx, msgtext)
    if (ctx.message.from.id == this.thinker) {
          if (eq(msgtext, this.word)) {
              //No se puede quemar la propia
          }
          else if (this.answers.length > 0 && eq(this.answers[0].text, msgtext)) {
              this.burnword(ctx, msgtext)
          }
    }
    else if (!this.acceptingAnswer && eq(msgtext, this.word))  {
        //Mandaron la palabra al grupo
        ctx.replyWithSticker("CAADAQADYQEAAukKkgmrVOefUfmVIQI")
        delete this.statecontext.state
    }
    else if (this.acceptingAnswer && ctx.message.from.id == this.contacteando) {
        this.burnt.add(msgtext)
        this.forwardAnswer()
        if (eq(this.answers[0], msgtext)) { //&& answers[msgtext] != ctx.message.from.id
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
        this.pending = setTimeout(this.secondElapsed.bind(this), 1000)
        this.contacteando = ctx.message.from.id
    }
    
    else if (this.acceptingAnswer) {
        console.log("DEBUG: I am currently listening for answers")
    }
}

secondElapsed() {
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
  //console.log("WA")
  if (this.time == undefined) return
  //clearTimeout(this.pending)
  this.forwardAnswer()
  if (this.acceptingAnswer) {
      this.endContacto(undefined)
      if (this.phase == 2) 
        sendMessage(this.GRUPO, "Tardaste mucho")
  }
}
  
onMatch(ctx, msgtext) {
  logToFile(this.GRUPO + ": Match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n"); 
  this.progress += 1
  this.endContacto(msgtext)
  //this.time = undefined
  this.answers = []
  this.awaiting = {}
}

onNoMatch(ctx, msgtext) {
  logToFile(this.GRUPO + ": No match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n")
  this.endContacto(msgtext)
}
  
burnword(ctx, msgtext) {
  logToFile(this.GRUPO + ": " + this.thinker + " burnt a word from " + this.answers[0].from + "\n")
  reply(ctx, "Quemada")
  this.endContacto(undefined)
}
  
endContacto(guess) {
  this.contacteando = undefined
  this.time = undefined
  clearTimeout(this.pending)
  this.acceptingAnswer = false
  if (eq(guess, this.word) || eq(this.answers[0].text, this.word)) {
    sendMessage(this.GRUPO, "Sí, era esa")
    this.win()
    return
  }
  this.burnt.add(this.answers[0].text)
  this.answers.shift()
  setTimeout(this.front.bind(this), 1000)
}
  
front() {
  this.time = undefined
  if (this.answers.length == 0) {
    this.nextLetter()
  } else {
    bot.telegram.forwardMessage(this.GRUPO, this.answers[0].from, this.answers[0].defid)
  }
}

forwardAnswer() {
  var key = this.answers[0]
  bot.telegram.forwardMessage(this.GRUPO, this.answers[key].from, this.answers[key].msgid)
}

nextLetter() {
  sendMessage(this.GRUPO, "*" + cap1(this.word.slice(0, this.progress + 1)) + "*")
  if (this.word == this.word.slice(0, this.progress + 1)) {
      sendMessage(this.GRUPO, "Bueno, es esa")
      delete this.statecontext.state
  }
}

sendMessageDelay (text, delay) {
    setTimeout(bot.telegram.sendMessage(this.GRUPO, text).bind(this), delay)
}

timeout() {
  if (this.phase == 2) {
    console.log(this)
    sendMessage(this.GRUPO, "Se acabó el tiempo! El [thinker](tg://user?id=" + this.thinker + ") ganó. La palabra era *" + cap1(this.word) + "*")
    clearTimeout(this.pending)
    this.time == undefined
  }
  delete this.statecontext.state
  save()
}
  
win() {
  var s = "" + TOTAL_TIME - parseInt((new Date() - this.currentTime) / 1000) + " segundos"
  sendMessage(this.GRUPO, "Tiempo restante: " + s)
  delete this.statecontext.state
}

}

var save = () => {
  var status2 = {}
  for (var grupo in status) {
    status2[grupo] = {}
    status2[grupo].word = status[grupo].state.word
    status2[grupo].progress = status[grupo].state.progress
    status2[grupo].burnt = Array.from(status[grupo].state.burnt)
    status2[grupo].thinker = status[grupo].state.thinker
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
      status[grupo] = {}
      if (status2[grupo].word != null) {
        status[grupo].state = new phase2(grupo, status[grupo], status2[grupo].word, status2[grupo].thinker)
        status[grupo].state.progress = status2[grupo].progress,
        status[grupo].state.burnt = new Set(status2[grupo].burnt),
        status[grupo].state.currentTime = new Date(),
        status[grupo].state.fulltimeout = setTimeout(status[grupo].state.timeout.bind(status[grupo].state), TOTAL_TIME*1000)
        sendMessage(-258588711, "Game restored")
      } else {
        status[grupo].state = new phase0(grupo, status[grupo])
      }
    }
  } catch (error) {
    console.log("Error leyendo status")
  }
  
}
                           
var cap1 = (string) => {
  return string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)
}

var logToFile = (string) =>
  fs.appendFile("./record.txt", string, function(err) {}); 

var matchesAny = (array, string) =>
  array.some((elem) => eq(elem, string))

const isAlpha = ch =>
	su.isAlpha(ch) && !su.hasXinARow(ch, 3) && ch.length >= 2;

var eq = function(string1, string2) {
  if (string1 == null || string2 == null) return false
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

bot.on('left_chat_member', (ctx) => {
    gm.onLeftChatMember(ctx)
})

var activeGroups = (idperson) => {
    var groups = gm.groups()
    if (idperson in groups)
      return Array.from(groups[idperson]).filter((g) => g in status && status[g].phase > 0)
    else return []
}

var sendMessage = (chat, message) =>
  msg.sendMessage(chat, message)

var reply = (ctx, message) => 
  msg.reply(ctx, message)

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