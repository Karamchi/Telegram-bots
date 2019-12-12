const Telegraf = require('telegraf')
const fs = require('fs')

const bot = new Telegraf(process.env.TOKEN)

var sticker = undefined
var dict = undefined

//"CAADBAADUwEAAs9TggzHLV--ZtlgsAI" hacerlo otro

bot.start((ctx) => ctx.reply('Welcome!'))

var toAscii = (string) => {
  return string.toLowerCase()
        .replace(/á/, 'a')
        .replace(/é/, 'e')
        .replace(/í/, 'i')
        .replace(/ó/, 'o')
        .replace(/ú/, 'u')
        .replace(/ü/, 'u')
        .replace(/[^a-zñ ]/gi, '')
}

var matchesAny = (word2, string1) => {
  for (var i in string1) {
    var word1 = string1[i]
    if (word1.startsWith(word2)) {
      return true
    }
  } 
  return false
}

var matches = (string1, string2) => {
  for (var i in string2) {
    var word = string2[i]
    if (!matchesAny(word, string1)) {
      return false
    }
  } 
  return true
}

bot.on('inline_query', (ctx) => {

  var buffer = fs.readFileSync("./dictArray.json", 'utf8');
  try {
    dict = JSON.parse(buffer)
  } catch (error) {
    console.log("Error leyendo dict")
  }
  
  var results = []
  var query = toAscii(ctx.inlineQuery.query)
  console.log(query)
  for (var key in dict) {
  
    var array = dict[key]
    //console.log(array)
    for(var i in array) {
      var phrase = toAscii(array[i])
      //console.log(phrase)
      if(query.length > 1 && matches(phrase.split(" "), query.split(" "))) {
        results.push({
          type: "sticker",
          id: key,
          sticker_file_id: key
        })
        //console.log(results)
        break
      }
    }
  }

  ctx.answerInlineQuery(results.slice(0, 51))
})

bot.on('sticker', ctx => {
  ctx.reply(ctx.message.sticker.file_id)
  //if (ctx.message.from.id != 160565993) return;
  sticker = ctx.message.sticker.file_id
  if (sticker == undefined) return
  ctx.reply("Mandá la frase o /delete para borrarlo")
})

bot.on('text', ctx => {
  if (sticker != undefined) {
    var buffer = fs.readFileSync("./dictArray.json", 'utf8');
    try {
       dict = JSON.parse(buffer)
    } catch (error) {
      ctx.reply("Error leyendo dict")
      return
    }
    if (ctx.message.text == "/delete") {
      for (var key in dict) {
        if (key == sticker) {
          delete dict[key]
          ctx.reply("Old entry removed")
        }
      }
    } else {
      if (!(sticker in dict)) {
        dict[sticker] = []
      }
      dict[sticker].push(toAscii(ctx.message.text))
      ctx.reply("New entry added")
    }
    sticker = undefined
    fs.writeFile("./dictArray.json", JSON.stringify(dict, null, 4), function(err) {});
  }
})

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
