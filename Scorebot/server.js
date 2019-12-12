const Telegraf = require('telegraf')
const schedule = require('node-schedule')
const Matrixes = require('./matrixes')
var fs = require('fs');

const bot = new Telegraf(process.env.TOKEN)

var lastMessage = {}
var lastMessagePosta = {}
const ME = 160565993
const WITTY = 573582514
const SMAUGS = -226076541

var toAscii = function(str) {
        return str.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/¿/g, '?')
        .replace(/\./g, '')
}

bot.start((ctx) => ctx.reply('Welcome!'))

bot.on('sticker', (ctx) => {
    lastMessage[ctx.chat.id] = ctx.message
    lastMessagePosta[ctx.chat.id] = ctx.message
})

bot.on(['audio', 'document', 'video', 'voice', 'contact', 'location', 'venue', 'new_chat_title', 'new_chat_photo', 'channel_chat_created', 'pinned_message', 'game', 'video_note'], (ctx) => {
    lastMessage[ctx.chat.id] = ctx.message
    lastMessagePosta[ctx.chat.id] = ctx.message
})

bot.on('text', (ctx) => {

    try {

    const msgtext = toAscii(ctx.message.text)
    if (ctx.message.chat.id == -1001092578031)
        bot.telegram.forwardMessage(-255486826, ctx.message.chat.id, ctx.message.message_id) //Test

    if (msgtext === '+1 @tuvieja_bot') {
        voteFor(ctx, WITTY, "WittyBot", 1)
    } else if (msgtext === '-1 @tuvieja_bot') {
        voteFor(ctx, WITTY, "WittyBot", -1)
    } else if (msgtext.match("^(k?(j|a| )* )?\\+[1-9][0-9]*( .*)?$")) {
        console.log(msgtext)
        vote(ctx, 1)
    } else if (msgtext.match("^(k?(j|a| )* )?\\-[1-9][0-9]*( .*)?$")) {
        vote(ctx, -1)
    } else if (msgtext.includes("/scoreboard")) {
        var dicts = dictsFromLog(ctx.chat.id) 
        show(ctx, dicts[0], false, "Scores:")
    } else if (msgtext.includes("/voters")) {
        var dicts = dictsFromLog(ctx.chat.id)
        show(ctx, dicts[1], true, "Voters:")
    } else if (msgtext.includes("/full_stats")) {
        if (ctx.chat.id == ME) {
          var dicts = dictsFromLog() 
          for (var i in dicts)
            ctx.reply(dicts[i]) 
        } else {
          yearReport(ctx)
        }
    } else if (msgtext.includes("conto?")) {
        if (ctx.message.reply_to_message)
          ctx.reply(conto(ctx.chat.id, ctx.message.reply_to_message) ? "Sí" : "No")
        else
          ctx.reply(conto(ctx.chat.id, lastMessagePosta[ctx.chat.id]) ? "Sí" : "No")
    } else if (msgtext.includes("/year_report")) {
        var year = msgtext.split("_")[2]
        yearReport(ctx, year)
    } else if (lastMessage[ctx.chat.id]) {
        lastMessage[ctx.chat.id] = ctx.message
    }
    lastMessagePosta[ctx.chat.id] = ctx.message
  
    } catch (err) {
        bot.telegram.forwardMessage(-258588711, ctx.message.chat.id, ctx.message.message_id)
    }
})

const yearReport = (ctx, year) => {
    var dicts = dictsFromLog(ctx.chat.id, year)
    show(ctx, dicts[0], true, "Scores:")
    show(ctx, dicts[1], true, "Voters:")
    showTopFromGraph(ctx, dicts[2])
    showBestWorstComment(ctx, dicts[3])
    pagerank(ctx, dicts[2])
}

const pagerank = (ctx, graph) => {
    if (ctx.chat.id in graph) {
        var chatGraph = graph[ctx.chat.id]
        var matrix = []
        var i = 0
        var reverse = {}
        for (var key in chatGraph) {
          reverse[key] = i
          i++
        }
        var forward = Object.keys(chatGraph)
        //console.log(forward, reverse)

        for (var key in chatGraph) {
          var vector = []
          for (var key_2 in chatGraph[key]) {
            if (key_2 in reverse)
              vector[reverse[key_2]] = chatGraph[key][key_2]
          }
          //Matrixes.softmax(vector, i)
          Matrixes.normalize_min0(vector, i)
          matrix[reverse[key]] = vector
        }
      
        Matrixes.transpose(matrix)
        var res = Matrixes.pagerank(matrix)
        
        var tuples = []
        for (i = 0; i < forward.length; i++)
            tuples.push([findName(forward[i]), res[i]])
      
        tuples.sort(function(a, b) {
            a = a[1];
            b = b[1];

            return a < b ? 1 : (a > b ? -1 : 0);
        })
      
        //console.log(res)

        var answer = "Pangerank:\n"
        for (var i = 0; i < tuples.length; i++) {
            answer += tuples[i][0] + ": " + tuples[i][1].toFixed(4) + '\n'
        }
        ctx.reply(answer)
        
    }
}

const getFrom = function(dicc, key) {
    if (key in dicc)
        return dicc[key]
    else
        return {}
}

const updateDict = function(chatId, scorerId, value, dict) {
  //ctx.telegram.sendMessage(160565993, buffer.toString())
  if (scorerId == undefined) return
  
  const plusValue = (value + 1)/2
  const minusValue = 1 - plusValue
  
  var chatScores = getFrom(dict, chatId)
  if (scorerId in chatScores)
      chatScores[scorerId] = {p: chatScores[scorerId].p + plusValue, m: chatScores[scorerId].m + minusValue}
  else
      chatScores[scorerId] = {p: plusValue, m: minusValue}

  dict[chatId] = chatScores

}

const updateGraph = function(chatId, scorerId, fromId, value, graph) {
  //ctx.telegram.sendMessage(160565993, buffer.toString())
  const chatGraph = getFrom(graph, chatId)
  const fromGraph = getFrom(chatGraph, fromId)
  if (scorerId in fromGraph)
      fromGraph[scorerId] += value
  else
      fromGraph[scorerId] = value
  chatGraph[fromId] = fromGraph
  graph[chatId] = chatGraph

}

const dictsFromLog = function(chatid, year) {
  var scorers = {}
  var voters = {}
  var graph = {}
  var msgScores = {}
  
  if (year == undefined) 
    year = new Date().getFullYear()
  
  var lines = fs.readFileSync('./log', 'utf-8').split(/\r?\n/)
  
  for (var i in lines) {
    try {
      var voto = JSON.parse(lines[i])
      //console.log(year, voto.year)
      if ((voto.year == year) && (voto.chatid == chatid || chatid == undefined)) {
        loadVote(voto, scorers, voters, graph, msgScores)
        //console.log(voto.value)
      }
    } catch(e) {
      
    }
  }
  
  return [scorers, voters, graph, msgScores]
}

const showBestWorstComment = function(ctx, dict) {
  if (ctx.chat.id in dict) {
    
    var chatDict = dict[ctx.chat.id]
  
    var maxKey = undefined
    var minKey = undefined
    var max = 0
    var min = 0
    for (var key in chatDict) {
      if (chatDict[key].p > max) {
        maxKey = key
        max = chatDict[key].p
      } else if (-chatDict[key].m < min) {
        minKey = key
        min = -chatDict[key].m
      }
    }

    if (max > 0) {
      var best = "Best comment (" + chatDict[maxKey].p + " upvotes)"
      bot.telegram.sendMessage(ctx.chat.id, best, {reply_to_message_id: maxKey})
    }

    if (min < 0) {
      var worst = "Worst comment (" + chatDict[minKey].m + " downvotes)"
      bot.telegram.sendMessage(ctx.chat.id, worst, {reply_to_message_id: minKey})
    }
  }
}

const loadVote = function(voto, scorers, voters, graph, msgScores) {
  var chatId = voto.chatid
  var fromId = voto.from
  var scorerId = voto.to
  var value = voto.value

  updateDict(chatId, scorerId, value, scorers)
  updateDict(chatId, fromId, value, voters)
  updateGraph(chatId, scorerId, fromId, value, graph)
  updateDict(chatId, voto.msgidTo, value, msgScores)
  
}

const voteFor = function(ctx, scorerId, name, value, toId) {
  const plusValue = (value + 1)/2
  const minusValue = 1 - plusValue

  const fromUser = ctx.message.from

  var voto = {
    year: new Date().getFullYear(),
    chatid: ctx.chat.id,
    msgid: ctx.message.message_id,
    from: fromUser.id,
    to: scorerId,
    msgidTo: toId,
    value: value
  }
  
  fs.appendFile("./log", JSON.stringify(voto) + "\n", function(err) {}); 
  ctx.telegram.sendMessage(160565993, ctx.chat.id + ": " + fromUser.first_name + " ==" + value + "=> " + name)
  
  
  var buffer = fs.readFileSync("./names");
  var names = JSON.parse(buffer)
  names[fromUser.id] = fromUser.first_name 
  names[scorerId] = name
  fs.writeFile("./names", JSON.stringify(names, null, 4), function(err) {}); 

}

const vote = function(ctx, value) {

  var orig = ctx.message.reply_to_message
  if (!orig && ctx.chat.id in lastMessage)
    orig = lastMessage[ctx.chat.id]
  if (!orig)
    return
  
  //ctx.reply(orig)

  if (orig.from.id === ctx.message.from.id)
    //ctx.reply("Self upvote")
    return
   
  if (yaLoVoto(ctx.chat.id, orig, ctx.message.from.id, value)) {
    return
  }
  
  if (conto(ctx.chat.id, orig)) {
    return
  }

  var scorer = orig.from

  voteFor(ctx, scorer.id, scorer.first_name, value, orig.message_id)
}

var show = function(ctx, dicc, full, name) {
    var answer = name + "\n"
    if (ctx.chat.id in dicc) {
        var chatScores = dicc[ctx.chat.id]       
        var tuples = [];

        for (var key in chatScores)
            tuples.push([findName(key), chatScores[key].p, chatScores[key].m]);

        tuples.sort(function(a, b) {
            if (full) {
                a = a[1];
                b = b[1];
            } else {
                a = a[1] - a[2];
                b = b[1] - b[2];
            }

            return a < b ? 1 : (a > b ? -1 : 0);
        })

        for (var i = 0; i < tuples.length; i++) {
            answer += tuples[i][0] + ": "
            if (full)
                answer += "+" + tuples[i][1] + "/-" + tuples[i][2]
            else
                answer += (tuples[i][1] - tuples[i][2])
            answer += '\n'
        }
        ctx.reply(answer)
    } else {
        ctx.reply(answer + "No records")
    }
}

var findName = function(id) {
    var buffer = fs.readFileSync("./names");
    var names = JSON.parse(buffer)
    if (id in names)
        return names[id]
    return "Unknown"
}

var showTopFromGraph = function(ctx, graph) {
    var tuples = [];
    if (ctx.chat.id in graph) {

        var chatGraph = graph[ctx.chat.id]

        for (var from in chatGraph) {
            for (var to in chatGraph[from]) {
                tuples.push([findName(from), findName(to), chatGraph[from][to]])
            }
        }

        tuples.sort(function(a, b) {
            a = a[2];
            b = b[2];

            return a < b ? 1 : (a > b ? -1 : 0);
        })

        var answer = "More love:\n"
        for (var i = 0; i < Math.min(3, tuples.length); i++) {
            answer += tuples[i][0] + " -> " + tuples[i][1] + ": " + tuples[i][2] + '\n'
        }
        answer += "\nMore hate:\n"
        for (var i = 0; i < Math.min(3, tuples.length); i++) {
            var j = tuples.length - i - 1
            answer += tuples[j][0] + " -> " + tuples[j][1] + ": " + tuples[j][2] + '\n'
        }
        ctx.reply(answer)
    }
}

const yaLoVoto = (chatid, msg, fromId, value) => {
  
  var lines = fs.readFileSync('./log', 'utf-8').split(/\r?\n/)
  
  for (var i in lines) {
    try {
      var voto = JSON.parse(lines[i])
      if (voto.chatid == chatid 
          && voto.msgidTo == msg.message_id
          && voto.from == fromId
          && voto.value == value)
        return true
    } catch(e) {
    }
  }
  
  return false
}

const conto = (chatid, msg) => {
  
  var msgid = msg.message_id
  var lines = fs.readFileSync('./log', 'utf-8').split(/\r?\n/)
  
  for (var i in lines) {
    try {
      var voto = JSON.parse(lines[i])
      if (voto.chatid == chatid && voto.msgid == msgid)
        return true
    } catch(e) {
      
    }
  }
  
  return false
}

const getAllGroups = () => {
    
  var lines = fs.readFileSync('./log', 'utf-8').split(/\r?\n/)
  
  var res = new Set([])
  
  for (var i in lines) {
    try {
      var voto = JSON.parse(lines[i])
      res.add(voto.chatid)
    } catch(e) {
      
    }
  }
  
  return Array.from(res)
}
schedule.scheduleJob('30 4 1 1 *', () => {
  var groups = getAllGroups()
  for (var i in groups) {
    var group = groups[i]
    bot.telegram.sendMessage(group, "Happy new year!")
    bot.telegram.sendMessage(group, "Scores will be reset now")
    bot.telegram.sendMessage(group, "You can see them at any time using the command /year_report_" + (new Date().getFullYear() - 1))
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