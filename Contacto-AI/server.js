const schedule = require('node-schedule')
const Telegraf = require('telegraf')
const msg = require('./sendMessage')
const gm = require('./groups');
const su = require('./stringUtils');
var GROUP = undefined
const DATAMUSE = "http://api.datamuse.com/words"
var language = ""
var progress = undefined
var definition = undefined
var answer = undefined

const bot = new Telegraf(process.env.TOKEN)

msg.setBot(bot)

bot.start((ctx) => {
        ctx.reply('Welcome')
    })

bot.on('new_chat_members', (ctx) => {

})

bot.hears('test', (ctx) => {  
   bot.telegram.getChatMember(ctx.chat.id, 0).then(x => console.log(x)).catch(x => console.log(x))
})

var https = require("https")
bot.hears('/about', (ctx) => {
  //dirae().then(res => console.log(res))
})

var dirae = () => {
  var host = "https://dirae.es/palabras/?q=%22poco%20tiempo%22"
  return new Promise(function(resolve, reject) {
    https.get(host, (resp) => {
      resp.setEncoding('utf8')
      var data = ""
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => {
        var res = []
        var x = data.split('\n')
        for (var l in x) {
          var line = x[l]
          if (line.includes("palabra") && line.includes("en las definiciones")) {
            line = line.split(">")[1]
            line = line.split("<")[0]
            res.push(line)
          }
        }
        resolve(res)
      })
    })
  })
}

var fb = () => {
  
  const options = {
    hostname: 'www.facebook.com',
    path: 'elfutbolazo',
    headers: { 'User-Agent': 'Chrome/77.0.3865.90' }
  };
  
  return new Promise(function(resolve, reject) {
    
  https.get(options, (resp) => {
      resp.setEncoding('utf8')
      resp.on('data', chunk => {
        console.log("a1");
        console.log(chunk)
      })
      resp.on('error', (e) => {
          console.log("a2");
          console.log(e);
      });
    })
  })
  //https://graph.facebook.com/v4.0/elfutbolazo/feed?access_token=EAARIiaaZATHgBACEHXNWxaCHAVL33NvqXxPYM3dEaBdCXnfgZCRVosiZCko8iAZBJsuWzxUjmVRgTGgGE7dX4XNNOZA7Rs6IyxoX6ZBCrKCb7XKFy8iBlb0sMezxH32YHZAZA8kMzQCb5hWVATcXvi9A3liGKZBSZAlJSBoN0TkropMjAeFg5yYArijFi4GWveN2Cr9d9VFuZCECQQDggMOX6fJZAz7mjB87INsZD
}

bot.hears('/fb', (ctx) => {
    fb()
    console.log("b")
})

bot.hears('/help', (ctx) => {
  ctx.reply("This is a thinker bot for @contact_game_bot. When it asks for a word," +
            "you can use either /think or /pensar to make me think of a word")
})

bot.hears('/think', (ctx) => {
    language = ""
    pensar(ctx)
})

bot.hears('/pensar', (ctx) => {
    language = "&v=es"
    pensar(ctx)
})

bot.hears('/definir', (ctx) => {
    language = "&v=es"
    console.log(DATAMUSE + "?max=15&sp=" + progress + "*" + language + "&md=d")
    get(DATAMUSE + "?max=15&sp=" + progress + "*" + language + "&md=d").then(answers => {
    for (var i = 0; i < 1; i++) {
      if (answers.length > 0) {
        var j = Math.floor(Math.random() * answers.length)
        if (answers[j].word.length > 3 && !answers[j].word.includes(" ") && "defs" in answers[j]) {
          definition = su.toAscii(answers[j].defs[0])
          console.log(answers[j].word)
          answer = su.toAscii(answers[j].word)    
          bot.telegram.sendMessage(GROUP, definition.split("\t")[1])
          http.get("http://contacto-bot.glitch.me/define?msg=" + answer
          + "&chat=" + GROUP + "&def=" + definition)
        }
        else i--
        answers.splice(j, 1)
      }
    }
        
  })
})

var pensar = (ctx) => {
  
  if (ctx.message.chat.type == "private") return
  GROUP = ctx.message.chat.id

  var i = "abcdefghijklmnñopqrstuvwxyz".charAt(Math.floor(Math.random() * 27))
  
  get(DATAMUSE + "?&max=20&sp=" + i + "*" + language).then((answers) => {
    for (var i in answers) {
      if (answers[i].word.length > 3) {
        http.get("http://contacto-bot.glitch.me/think?msg=" + su.toAscii(answers[i].word)
                 + "&chat=" + GROUP)
        return
      }
    }
  })
}

var handleDefinition = (def, progress) => {
  //md = d da definiciones
  def = def.replace(/ /g, "+")
  console.log(DATAMUSE + "?ml=" + def + "&max=3&sp=" + progress + "*" + language)
  get(DATAMUSE + "?ml=" + def + "&max=3&sp=" + progress + "*" + language).then(answers => {
    if (answers.length > 0)
      for (var j in answers)
        if (answers[j].word.length > 3 && !answers[j].word.includes(" ")) {
          sendMessage(GROUP, su.toAscii(answers[j].word))
        }
    else randomAnswers(progress)
  })
}

var randomAnswers = (progress) => {
  //md = d da definiciones
  console.log(DATAMUSE + "?max=20&sp=" + progress + "*" + language)
  get(DATAMUSE + "?max=20&sp=" + progress + "*" + language).then(answers => {
    for (var i = 0; i < 3; i++) {
      if (answers.length > 0) {
        var j = Math.floor(Math.random() * answers.length)
        if (answers[j].word.length > 3 && !answers[j].word.includes(" ")) {
          sendMessage(GROUP, su.toAscii(answers[j].word))
        }
        else i--
        answers.splice(j, 1)
      }
    } 
  })
}

var get = (host) => {
  return new Promise(function(resolve, reject) {
    http.get(host, (resp) => {
      resp.setEncoding('utf8')
      resp.on('data', (chunk) => {
        resolve(JSON.parse(chunk))
      })
    })
  })
}


bot.on('text', ctx => GROUP = ctx.message.chat.id)

bot.startPolling()

const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200)
});
app.get("/direct/", (request, response) => {
  response.sendStatus(200)
  handleDefinition(request.query.msg, request.query.progress)
});
app.get("/progress/", (request, response) => {
  response.sendStatus(200)
  console.log(request.query.progress)
  progress = (request.query.progress)
});
app.get("/definition/", (request, response) => {
  response.sendStatus(200)
  bot.telegram.sendMessage(GROUP, definition)
});
app.get("/answer/", (request, response) => {
  response.sendStatus(200)
  bot.telegram.sendMessage(GROUP, answer)
});


app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

//160565993

var sendMessage = (chat, message) => {
  msg.sendMessage(chat, message)
}