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
        sendMessage(-258588711, "Added to group " + ctx.message.chat.id) //Test
        ctx.reply("Hi! use /newgame to start a new game or /help to learn how to use me")
    }     
})

bot.hears(['/help','/about@contact_game_bot'], (ctx) => {
  for (var st in strings.help)
    reply(ctx, strings.help[st])
})

bot.hears(['/about','/about@contact_game_bot'], (ctx) => {
  for (var st in strings.about)
    reply(ctx, strings.about[st])
})

bot.hears(['/help_game','/help_game@contact_game_bot'], (ctx) => {
  for (var st in strings.help_game)
    reply(ctx, strings.help_game[st])
})

bot.hears(['/help_bot','/help_bot@contact_game_bot'], (ctx) => {
  for (var st in strings.help_game)
    reply(ctx, strings.help_bot[st])
})

bot.hears('/stats', ctx => {
  var buffer = fs.readFileSync("./record.txt", 'utf8');
  try {
    var x = buffer.split('\n')
    var ps = {}
    var as = {}
    var b1s = {}
    var b2s = {}
    var defs = {}
    for (var i in x) {
      var line = x[i]
      if (line == null) continue
      var g = line[0] == "-" 
      if (line.includes("atch")) {
        if (line.includes("No")) {
          var p = line.split(" ")[4 + g]
          var a = line.split(" ")[6 + g]
          if (as[p] == undefined) ps[p] = [0, 0]
          if (as[a] == undefined) as[a] = [0, 0]
          ps[p][1] += 1
          as[a][1] += 1
        } else {
          var p = line.split(" ")[3 + g]
          var a = line.split(" ")[5 + g]
          if (ps[p] == undefined) ps[p] = [0, 0]
          if (as[a] == undefined) as[a] = [0, 0]
          ps[p][0] += 1
          as[a][0] += 1
        }
        
      } else if (line.includes("burn")) {
        var p = line.split(" ")[0 + g]
        if (b1s[p] == undefined) b1s[p] = 0
        b1s[p] += 1
        var a = line.split(" ")[5 + g]
        if (b2s[a] == undefined) b2s[a] = 0
        b2s[a] += 1
      } else {
        var p = line.split(" ")[0 + g].replace(":", "")
        if (defs[p] == undefined) defs[p] = 0
        defs[p] += 1
      }
    }
    
    console.log("Estadísticas adivinando palabras: ")
    for (var i in as)
      console.log(""+ i + ": " + (as[i][0] + as[i][1]) + " contactos, " + as[i][0] / (as[i][0] + as[i][1]) + " aciertos" )
    for (var i in b2s)
      console.log(""+ i + ": palabras quemadas: " + b1s[i])
    
    console.log("Estadísticas definiendo palabras: ")
    
    for (var i in defs)
      console.log(""+ i + " palabras definidas: " + defs[i])
    for (var i in ps)
      console.log(""+ i + ": " + (ps[i][0] + ps[i][1]) + " contactos, " + ps[i][0] / (ps[i][0] + ps[i][1]) + " aciertos" )
    for (var i in b1s)
      console.log(""+ i + ": palabras quemadas: " + b2s[i])
    
  } catch (error) {
    console.log(error)
  }
})

bot.on('text', ctx => onText(ctx))
  
var onText = (ctx) => {  
    //console.log(ctx.message)
    var msgtext = su.toAscii(ctx.message.text)
  
    console.log(msgtext)
    if (Object.keys(status).length == 0)
      restore()
    
    var GRUPO = undefined
    if (ctx.message.chat.type != "private") {
      gm.saveRelation(ctx.message.from.id, ctx.message.chat.id)
      GRUPO = ctx.message.chat.id
      //console.log(!GRUPO in status)
    } else {
      var ag = desambiguar(ctx.message.from.id, msgtext)
      if (ag.length == 0) {
        return
      } else if (ag.length == 1) {
        GRUPO = ag[0]
      } else {
        reply("There is more than one active group for your user")
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
        if (!(GRUPO in status) || status[GRUPO].phase != 2) {
          status[GRUPO] = new juego(GRUPO)
        } else {
          sendMessage(GRUPO, "You have to finish the current game first. Use /status to check the current progress or /ff to end the game if you are the thinker")
        }
        
        /*if (ctx.message.chat.type == "group" && status[GRUPO].phase != 0 && ctx.message.chat.id != GRUPO) {
            ctx.reply("A game is already running in another group and this bot is too beta to handle that")
            return 1;
        }*/
       }
 
    if (!(GRUPO in status))
      return
  
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
}

class juego {
  
constructor(groupid) {
  this.phase = 0

  this.pending = undefined
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
  this.iddel3 = undefined
  this.colaVar = []
}
  
phase0(ctx, msgtext) {
  if (msgtext.includes("/newgame") && ctx.message.chat.type != "private") {
      reply(ctx, "A new game has been started. Send me a word [privately](tg://user?id=504979973)")
      //this.GRUPO = ctx.message.chat.id
      clearTimeout(this.fulltimeout)
      this.phase = 1
  }
  if (msgtext.includes("/status")) {
    reply(ctx, "No game currently running")
  }
}

phase1(ctx, msgtext) {
    if (ctx.message.chat.type == "private") {
        if (!isAlpha(msgtext)) {
          reply(ctx, "Must be a single word with no symbols")
        } else if (msgtext.match("^(super|inter|anti).*")) {
          reply(ctx, "Sin prefijos porfa")
        } else {
          this.word = msgtext
          this.thinker = ctx.message.from.id
          if (msgtext == "debugdebug") this.thinker = 0
          //this.fulltimeout = setTimeout(this.timeout.bind(this), 960000)
          this.currentTime = new Date()
          var s = su.mentionUser(ctx.message.from)
          sendMessage(this.GRUPO, s + " pensó una palabra con *" + cap1(this.word.slice(0, 1)) + "*")
          sendPToThinkerBot(this.word.slice(0, 1))
          reply(ctx, "Word saved, the rest will try to guess it")
          this.phase = 2
          this.participants = new Set([])
          logToFile(this.GRUPO + ": " + this.thinker + " pensó: " + this.word + "\n")
        }
    }
}

phase2(ctx, msgtext) {
    if (msgtext.includes("/ff")) {
        if (ctx.message.from.id == this.thinker || this.thinker == "BOT") {
          var era = ""
          if (this.progress > 0) era = "The word was *" + this.word + "*"
          sendMessage(this.GRUPO, "The thinker has ended the game. " + era)
          this.win()
        } else {
          reply(ctx, "You can't end this game")
        }
    } else if (msgtext.includes("/status")) {
        this.front(true, ctx.message.chat.id)
    } else if (ctx.message.chat.type != "private") {
        this.groupMessage(ctx, msgtext)
    } else {
        //console.log(this)
        this.privateMessage(ctx, msgtext)
    }
  
    
}

privateMessage(ctx, msgtext) {
  if (/* */ ctx.message.from.id != this.thinker) {
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
              logToFile(this.GRUPO + ": " + ctx.message.chat.id + ": " + this.awaiting[ctx.message.chat.id].text + "\n")
              
              var x = this.answers.filter(a => !eq(a.text, this.awaiting[ctx.message.chat.id].text))
              this.answers = x
              
              this.answers.unshift({text: this.awaiting[ctx.message.chat.id].text,
                                    from: ctx.message.chat.id, 
                                    msgid: this.awaiting[ctx.message.chat.id].msgid,
                                    defid: ctx.message.message_id})
              //bot.telegram.forwardMessage(this.GRUPO, ctx.message.chat.id, ctx.message.message_id)
              this.front(false)
              
              if (this.thinker == "BOT")
                sendToThinkerBot(msgtext, this.word.slice(0, this.progress + 1))
              
              console.log(this.answers)
              delete this.awaiting[ctx.message.chat.id]
              this.newParticipant(ctx.message.from.id)
            } 
            //showButton(ctx, GRUPO)
            //hideButtonFor(ctx, GRUPO, [thinker, ctx.message.chat.id])
        } else {
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

groupMessage(ctx, msgtext) {
  
    if (ctx.message.from.id == this.thinker) {
          if (msg.includes == "/bueno_casi") {
              logToFile(this.GRUPO + ": Match manual\n"); 
              this.progress += 1
              sendPToThinkerBot(this.progress)
              //this.time = undefined
              var x = this.answers.filter(a => a.text.slice(0, this.progress + 1) == this.word.slice(0, this.progress + 1))
              this.answers = x
              for (var key in Object.keys(this.awaiting)) {
                try {
                if (this.awaiting[key].text.slice(0, this.progress + 1) != this.word.slice(0, this.progress + 1))
                  delete this.awaiting[key]
                } catch (error) {
                  console.log("Can't delete " + key)
                }
              }
              this.front(true)
          }
          if (eq(msgtext, this.word)) {
              //No se puede quemar la propia
          }
          else if (this.answers.length > 0 && eq(this.answers[0].text, msgtext)) {
              this.burnword(ctx, msgtext)
          }
    }
    else if (msgtext.includes("/send_to_back")) {
        if (this.answers.length === 0) return;  
        this.answers.push(this.answers[0])
        this.answers.shift()
        this.front(false)
    }
    else if (msgtext.includes("/withdraw") && this.answers.length != 0 && ctx.message.from.id == this.answers[0].from) {
        this.answers.shift()
        this.front(false)
    }
    else if (!this.acceptingAnswer && eq(msgtext, this.word))  {
        //Mandaron la palabra al grupo
        ctx.replyWithSticker("CAADAQADYQEAAukKkgmrVOefUfmVIQI")
        this.win()
    }
    else if (this.acceptingAnswer && ctx.message.from.id == this.contacteando) {
        /*console.log(ctx.message.date*1000)
        console.log(this.acceptingAnswer)
        if (ctx.message.date < Math.floor(this.acceptingAnswer/1000)) {
          console.log(ctx.message.date*1000)
          console.log(this.acceptingAnswer)
          return
        }*/
        if (this.iddel3 == undefined) {
          this.colaVar.unshift([ctx, msgtext])
        } else if (this.iddel3 < ctx.message.message_id) {
          this.burnt.add(msgtext)
          this.forwardAnswer()
          if (eq(msgtext, this.answers[0].text)) { //&& answers[msgtext] != ctx.message.from.id
            this.onMatch(ctx, msgtext)
          } else {
            this.onNoMatch(ctx, msgtext)         
          }
        }
    }
    else if (msgtext.includes("/contacto") && this.time == null) {
        if (this.answers.length === 0) return;
        if (this.answers[0].from == ctx.message.from.id) return;
            //Chequea que no esté haciendo contacto consigo mismo
        this.time = 0
        this.pending = setTimeout(this.secondElapsed.bind(this), 1000)
        this.contacteando = ctx.message.from.id
        this.newParticipant(ctx.message.from.id)
    }
    
    else if (this.acceptingAnswer) {
        console.log("DEBUG: I am currently listening for answers")
    }
}
  
secondElapsed() {
    if (this.time == undefined) return
    this.time += 1
    console.log("SE")
    bot.telegram.sendMessage(this.GRUPO, this.time).then((message) => {
      if (this.time == 3) {
        this.iddel3 = message.message_id
        console.log(this.iddel3)
        for (var i = 0; i < this.colaVar.length; i++) {
          if (this.iddel3 < this.colaVar[i][0].message.message_id) {
            console.log("VS")
            console.log(this.colaVar[i][0].message.message_id)
            var ctx = this.colaVar[i][0]
            var msgtext = this.colaVar[i][1]
            this.burnt.add(msgtext)
            this.forwardAnswer()
            if (eq(msgtext, this.answers[0].text)) { //&& answers[msgtext] != ctx.message.from.id
              this.onMatch(ctx, msgtext)
            } else {
              this.onNoMatch(ctx, msgtext)         
            }
          }
        }
        this.colaVar = []
      } else this.iddel3 = undefined
    })
    if (this.time < 3)
        this.pending = setTimeout(this.secondElapsed.bind(this), 1000)
    else {
        console.log("Open")
        this.acceptingAnswer = new Date() - 0
        this.pending = setTimeout(this.writeAnswer.bind(this), 5000)
    }
}

writeAnswer() {
  //console.log("WA")
  if (this.time == undefined) return
  //clearTimeout(this.pending)
  this.forwardAnswer()
  if (this.acceptingAnswer) {
      this.endContacto(undefined, false)
      if (this.phase == 2) 
        sendMessage(this.GRUPO, "Tardaste mucho")
  }
}

onMatch(ctx, msgtext) {
  logToFile(this.GRUPO + ": Match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n"); 
  this.progress += 1
  sendPToThinkerBot(this.progress)
  this.endContacto(msgtext, true)
  //this.time = undefined
  var x = this.answers.filter(a => a.text.slice(0, this.progress + 1) == this.word.slice(0, this.progress + 1))
  this.answers = x
  for (var key in Object.keys(this.awaiting)) {
    try {
    if (this.awaiting[key].text.slice(0, this.progress + 1) != this.word.slice(0, this.progress + 1))
      delete this.awaiting[key]
    } catch (error) {
      console.log("Can't delete " + this.awaiting[key])
    }
  }
}

onNoMatch(ctx, msgtext) {
  logToFile(this.GRUPO + ": No match entre P: " + this.answers[0].from + " A: " + ctx.message.from.id + "\n")
  this.endContacto(msgtext, false)
}
  
burnword(ctx, msgtext) {
  logToFile(this.GRUPO + ": " + this.thinker + " burnt a word from " + this.answers[0].from + "\n")
  reply(ctx, "Quemada")
  this.endContacto(undefined, false)
}
  
endContacto(guess, showNextLetter) {
  this.colaVar = []
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
  setTimeout(this.front.bind(this, showNextLetter), 1000)
}
  
front(showNextLetter, dst) {
  if (this.answers.length != 0) {
    if (dst == undefined) dst = this.GRUPO
    if (this.answers[0].from == "BOT") requestDefinition()
    else bot.telegram.forwardMessage(dst, this.answers[0].from, this.answers[0].defid)
  } if (this.answers.length == 0 || showNextLetter) {
    this.nextLetter()
  }
}

forwardAnswer() {
  if (this.answers[0].from == "BOT") requestAnswer()
  else bot.telegram.forwardMessage(this.GRUPO, this.answers[0].from, this.answers[0].msgid)
}

nextLetter() {
  sendMessage(this.GRUPO, "*" + cap1(this.word.slice(0, this.progress + 1)) + "*")
  if (this.word == this.word.slice(0, this.progress + 1)) {
      sendMessage(this.GRUPO, "Bueno, es esa")
      this.win()
  }
}

sendMessageDelay (text, delay) {
    setTimeout(sendMessage(this.GRUPO, text).bind(this), delay)
}
  
newParticipant(id) {
  if (this.participants == null) this.participants = new Set([])
  var prevSize = this.participants.size
  this.participants.add(id)
  if (prevSize == 1 && this.participants.size > 1) {
      this.fulltimeout = setTimeout(this.timeout.bind(this), TOTAL_TIME*1000)
      sendMessage(-258588711, "Timer started")
      this.currentTime = new Date()
  }
}

timeout() {
    if (this.phase == 2) {
      var era = ""
      if (this.progress > 0) era = "La palabra era *" + cap1(this.word) + "*"
      sendMessage(this.GRUPO, "Se acabó el tiempo! El [thinker](tg://user?id=" + this.thinker + ") ganó. "+ era)
      clearTimeout(this.pending)
      this.time = undefined
    }
    this.phase = 0
    save()
}
  
win() {
  var s = "" + TOTAL_TIME - parseInt((new Date() - this.currentTime) / 1000) + " segundos"
  if (this.participants != null && this.participants.size > 1) sendMessage(this.GRUPO, "Tiempo restante: " + s)
  clearTimeout(this.pending)
  this.time = undefined
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
  fs.writeFile("./status.txt", JSON.stringify(status2, null, 4), function(err) {});
}

var restore = () => {
  var buffer = fs.readFileSync("./status.txt", 'utf8');
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
        status[grupo].fulltimeout = setTimeout(status[grupo].timeout.bind(status[grupo]), TOTAL_TIME*1000)
        sendMessage(-258588711, "Game restored")
      }
    }
  } catch (error) {
    console.log("Error leyendo status")
  }
}
                    
var cap1 = (string) =>
  string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)

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
      return Array.from(groups[idperson]).filter(g => g in status && status[g].phase > 0)
    else return []
}

var desambiguar = (idperson, msgtext) => {
    var ag = activeGroups(idperson)
    if (ag.length <= 1) return ag
    var groups2 = ag.filter(g => status[g].phase == 2 && status[g].thinker != idperson)
    var awaiting = groups2.filter(g => idperson in status[g].awaiting)
    if (awaiting.length >= 1) return awaiting
    var matching = groups2.filter(g =>
      (msgtext.slice(0, status[g].progress + 1) == status[g].word.slice(0, status[g].progress + 1)))
    if (matching.length >= 1) return matching
    return ag.filter(g => status[g].phase == 1)
}

var sendMessage = (chat, message) => {
  msg.sendMessage(chat, message)
}

var reply = (ctx, message) => {
  msg.reply(ctx, message)
}

var sendToThinkerBot = (text, progress) => {
  text = text.replace(/ /g, "+")
  console.log("http://contacto-bot-ai.glitch.me/direct?msg=" + text + "&progress=" + progress)
  http.get("http://contacto-bot-ai.glitch.me/direct?msg=" + text + "&progress=" + progress);
}

var sendPToThinkerBot = (progress) => {
  http.get("http://contacto-bot-ai.glitch.me/progress?" + "&progress=" + progress);
}

var requestDefinition = () => {
  http.get("http://contacto-bot-ai.glitch.me/definition");
}

var requestAnswer = () => {
  http.get("http://contacto-bot-ai.glitch.me/answer");
}


bot.startPolling()

const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200)
});
app.get("/think/", (request, response) => {
  var group = request.query.chat
  console.log(group)
  if (status[group].phase != 1) return
  status[group].word = request.query.msg
  status[group].thinker = "BOT"
  status[group].currentTime = new Date()
  sendMessage(group, "El bot pensó una palabra con " + cap1(status[group].word.slice(0, 1)))
  status[group].phase = 2
  status[group].participants = new Set([])
});
app.get("/define/", (request, response) => {
  var group = request.query.chat
  var word = request.query.msg
  console.log(group)
  if (status[group].phase != 2) return
  status[group].answers.unshift({text: word,
                                 from: "BOT", //O sea, capaz puedo hacer que forwardee del grupo al desapilar?? 
                                })
  
});
app.get("/burn/", (request, response) => {
  var group = request.query.chat
  var ctx = {}
  ctx.message = {}
  ctx.message.from = {id: "BOT"} //800511518
  ctx.message.chat = {id: group}
  if (eq(request.query.msg, status[group].answers[0].text))
    response.sendStatus(200)
  else response.sendStatus(204)
  if (group in status) status[group].groupMessage(ctx, request.query.msg)
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);
