const schedule = require('node-schedule')
const Telegraf = require('telegraf')

const bot = new Telegraf(process.env.TOKEN)
var GRUPO = -305320173
var phase = 0
// 0 = No game
// 1 = Thinking word
// 2 = Playing
var pending = undefined
var definitions = {}
var progress = 0
var word = undefined
var thinker = undefined
var time = undefined
var acceptingAnswer = 0
// 0 = No acabamos de hacer contacto 1 2 3
// 1 = Ninguno de los dos hablo
// 2 = Uno de los dos habló
var saidAnswer = undefined
var answers = {}
var burnt = new Set([])

bot.start((ctx) => {
        ctx.reply('Welcome!')
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
    var msgtext = toAscii(ctx.message.text)
    if (msgtext.includes("/help")) {
        ctx.reply("Aprender a jugar al contacto es como pelar una naranja")
    }
    else if (msgtext.includes("/newgame") && ctx.message.chat.type == "group" && phase == 0) {
        ctx.reply("A new game has been started. Send me a word privately")
        GRUPO = ctx.message.chat.id
        phase = 1
        definitions = {}
        progress = 0
        word = undefined
        thinker = undefined
        time = undefined
        acceptingAnswer = 0
        saidAnswer = undefined
        answers = {}
        burnt = new Set([])
    }
    else if (phase == 1 && ctx.message.chat.type != "group") {
        word = msgtext
        bot.telegram.sendMessage(GRUPO, word.slice(0, 1))
        ctx.reply("Word saved, the rest will try to guess it")
        thinker = ctx.message.from.id
        phase = 2
    }
    else if (phase == 2 && acceptingAnswer == 1 && /*ctx.message.from.id != thinker && */ctx.message.chat.type == "group") {
        if (msgtext == word) {
            clearTimeout(pending)
            acceptingAnswer = 0
            saidAnswer = undefined
            ctx.reply("Fin")
            phase = 0
        } else {
            if (msgtext.slice(0, progress + 1) != word.slice(0, progress + 1)) {
                ctx.reply("Your word must match the current progress")
            } else if (burnt.has(msgtext)) {
                ctx.reply("That word is already burnt")
            } else {
                clearTimeout(pending)
                acceptingAnswer = 0
                saidAnswer = undefined
                time = undefined
                progress += 1
                ctx.reply(word.slice(0, progress + 1))
            }
        }
    }
    else if (phase == 2 && acceptingAnswer == 2 && /*ctx.message.from.id != thinker && */ctx.message.chat.type == "group") {
        if (msgtext == word) {
            clearTimeout(pending)
            acceptingAnswer = 0
            saidAnswer = undefined
            ctx.reply("Fin")
            phase = 0
        }
        else if (msgtext == saidAnswer /*&& answers[msgtext] != ctx.message.from.id*/) {
            if (msgtext.slice(0, progress + 1) != word.slice(0, progress + 1)) {
                ctx.reply("Your word must match the current progress")
            } else if (burnt.has(msgtext)) {
                ctx.reply("That word is already burnt")
            } else {
                clearTimeout(pending)
                acceptingAnswer = 0
                saidAnswer = undefined
                time = undefined
                progress += 1
                ctx.reply(word.slice(0, progress + 1))
            }
        } else {
            //ctx.reply("Debug message 1")
        }
    }
    else if (phase == 2 && msgtext.includes("/contacto") && /*ctx.message.from.id != thinker &&*/ ctx.message.chat.type == "group"
        && time == null) {
        time = 0
        var pending = setTimeout(secondElapsed, 1000)
        //Chequear que no esté haciendo contacto consigo mismo
    }
    else if (phase == 2 && ctx.message.chat.type == "group" && ctx.message.from.id == thinker) {
        if (msgtext == word) {
            //No se puede quemar la propia
        } else {
            burnt.add(msgtext)
        }
    }
    else if (phase == 2 && acceptingAnswer) {
        ctx.reply("DEBUG: I am currently listening for answers")
    }

})

var secondElapsed = function() {
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
  if (acceptingAnswer) {
    bot.telegram.sendMessage(GRUPO, "Time up")
    time = undefined
  }
    acceptingAnswer = false
    clearTimeout(pending)
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
