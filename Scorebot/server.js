const Telegraf = require('telegraf')
var fs = require('fs');

const bot = new Telegraf(process.env.TOKEN)

var messageLikers = {}
var lastMessage = {}
var lastMessagePosta = {}
const ME = 160565993
const WITTY = 573582514

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
    /*em = ctx.message.sticker.emoji
    if ("☝👆".includes(em))
        vote(ctx, 1)
    else if (em === "👎")
        vote(ctx, -1)
    else */
    lastMessage[ctx.chat.id] = ctx.message
    lastMessagePosta[ctx.chat.id] = ctx.message
})

bot.on(['audio', 'document', 'video', 'voice', 'contact', 'location', 'venue', 'new_chat_title', 'new_chat_photo', 'channel_chat_created', 'pinned_message', 'game', 'video_note'], (ctx) => {
    lastMessage[ctx.chat.id] = ctx.message
    lastMessagePosta[ctx.chat.id] = ctx.message
})

bot.on('text', (ctx) => {

    //try {

    const msgtext = toAscii(ctx.message.text)
    if (ctx.message.chat.id == -1001092578031)
        bot.telegram.forwardMessage(-255486826, ctx.message.chat.id, ctx.message.message_id) //Test
    /*if ("☝👆".includes(Array.from(msgtext)[0])) {
        vote(ctx, 1)
    } else if ((Array.from(msgtext)[0]) === '👎') {
        vote(ctx, 1)
    } else*/ 
    if (msgtext === '+1 @tuvieja_bot') {
        voteFor(ctx, WITTY, "WittyBot", 1)
    } else if (msgtext === '-1 @tuvieja_bot') {
        voteFor(ctx, WITTY, "WittyBot", -1)
    } else if (msgtext.match("^(k?(j|a| )* )?\\+[1-9][0-9]*( .*)?$")) {
        vote(ctx, 1)
    } else if (msgtext.match("^(k?(j|a| )* )?\\-[1-9][0-9]*( .*)?$")) {
        vote(ctx, -1)
    } else if (msgtext.includes("/scoreboard")) {
        show(ctx, "dict", false, "Scores:")
    } else if (msgtext.includes("/voters")) {
        show(ctx, "voters", true, "Voters:")
    } else if (ctx.chat.id == ME) {
        var orig = ctx.message.reply_to_message
        var path = process.cwd();
        if (msgtext.includes("/load_scores")) {
            fs.writeFile(path + "/dict", orig.text, function(err) {}); 
            ctx.reply("OK")
        } else if (msgtext.includes("/load_voters")) {
            fs.writeFile(path + "/voters", orig.text, function(err) {}); 
            ctx.reply("OK")
        } else if (msgtext.includes("/load_graph")) {
            fs.writeFile(path + "/graph", orig.text, function(err) {}); 
            ctx.reply("OK")
        } else if (msgtext.includes("/full_stats")) {
            var buffer = fs.readFileSync(path + "/dict");
            ctx.reply(JSON.parse(buffer))
          
            var buffer = fs.readFileSync(path + "/voters");
            ctx.reply(JSON.parse(buffer))
            var buffer = fs.readFileSync(path + "/graph");
            ctx.reply(JSON.parse(buffer))
        }
    } else if (msgtext.includes("/full_stats")) {
        show(ctx, "dict", true, "Scores:")
        show(ctx, "voters", true, "Voters:")
        showTopFromGraph(ctx)
    } else if (msgtext.includes("conto?")) {
        if (ctx.message.reply_to_message)
          ctx.reply(conto(ctx.chat.id, ctx.message.reply_to_message) ? "Sí" : "No")
        else if (lastMessage[ctx.chat.id])
          ctx.reply(conto(ctx.chat.id, lastMessagePosta[ctx.chat.id]) ? "Sí" : "No")
    } else {
        lastMessage[ctx.chat.id] = ctx.message
    }
    lastMessagePosta[ctx.chat.id] = ctx.message
  
    /*} catch (err) {
        bot.telegram.forwardMessage(-258588711, ctx.message.chat.id, ctx.message.message_id)
    }*/
})

//bot.hears('+1', (ctx) => vote(ctx, 1))
//bot.hears('👍', (ctx) => vote(ctx, 1))
//bot.hears('☝', (ctx) => vote(ctx, 1))
//bot.hears('👆', (ctx) => vote(ctx, 1))
//bot.hears('👎', (ctx) => vote(ctx, -1))
//bot.hears('-1', (ctx) => vote(ctx, -1))

const getFrom = function(dicc, key) {
    if (key in dicc)
        return dicc[key]
    else
        return {}
}

const updateDict = function(ctx, scorerId, name, plusValue, minusValue) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/dict");
    var dict = JSON.parse(buffer)
  //ctx.telegram.sendMessage(160565993, buffer.toString())
  var chatScores = getFrom(dict, ctx.chat.id)
  if (scorerId in chatScores)
      chatScores[scorerId] = {user: name, p: chatScores[scorerId].p + plusValue, m: chatScores[scorerId].m + minusValue}
  else
      chatScores[scorerId] = {user: name, p: plusValue, m: minusValue}

  dict[ctx.chat.id] = chatScores

  fs.writeFile(path + "/dict", JSON.stringify(dict, null, 4), function(err) {}); 
}

const updateVoters = function(ctx, fromUser, plusValue, minusValue) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/voters");
    var voters = JSON.parse(buffer)
  //ctx.telegram.sendMessage(160565993, buffer.toString())
  const chatVoters = getFrom(voters, ctx.chat.id)
  if (fromUser.id in chatVoters)
      chatVoters[fromUser.id] = {user: fromUser.first_name, p: chatVoters[fromUser.id].p + plusValue, m: chatVoters[fromUser.id].m + minusValue}
  else
      chatVoters[fromUser.id] = {user: fromUser.first_name, p: plusValue, m: minusValue}

  voters[ctx.chat.id] = chatVoters

  fs.writeFile(path + "/voters", JSON.stringify(voters, null, 4), function(err) {}); 

}

const updateGraph = function(ctx, scorerId, fromUser, name, value) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/graph");
    var graph = JSON.parse(buffer)
  //ctx.telegram.sendMessage(160565993, buffer.toString())
  const chatGraph = getFrom(graph, ctx.chat.id)
  const fromGraph = getFrom(chatGraph, fromUser.id)
  if (scorerId in fromGraph)
      fromGraph[scorerId] += value
  else
      fromGraph[scorerId] = value
  chatGraph[fromUser.id] = fromGraph
  graph[ctx.chat.id] = chatGraph

  fs.writeFile(path + "/graph", JSON.stringify(graph, null, 4), function(err) {}); 

}

const voteFor = function(ctx, scorerId, name, value) {
  const plusValue = (value + 1)/2
  const minusValue = 1 - plusValue

  const fromUser = ctx.message.from

  updateDict(ctx, scorerId, name, plusValue, minusValue)
  updateVoters(ctx, fromUser, plusValue, minusValue)
  updateGraph(ctx, scorerId, fromUser, name, value)

  var log = fromUser.first_name + " ==" + value + "=> " + name
  fs.appendFile("./log", "chatid: " + ctx.chat.id + " msgid: " + ctx.message.message_id + " - " + log + "\n", function(err) {}); 
  ctx.telegram.sendMessage(160565993, ctx.chat.id + ": " + log)

}

const vote = function(ctx, value) {

  var orig = ctx.message.reply_to_message
  if (!orig && ctx.chat.id in lastMessage)
    orig = lastMessage[ctx.chat.id]
  if (!orig)
    return 1
  
  //ctx.reply(orig)

  if (orig.from.id === ctx.message.from.id)
    //ctx.reply("Self upvote")
    return
   
  if (orig.message_id in messageLikers)
    var likers = messageLikers[orig.message_id]
  else
    var likers = []

  if (likers.includes(ctx.message.from.id))
    //ctx.reply("Already upvoted")
    return
  
  if (conto(ctx.chat.id, orig)) {
    return
  }

  likers.push(ctx.message.from.id)
  messageLikers[orig.message_id] = likers
  //ctx.reply(messageLikers)
  var scorer = orig.from

  voteFor(ctx, scorer.id, scorer.first_name, value)
}

var show = function(ctx, diccName, full, name) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/" + diccName);
    var dicc = JSON.parse(buffer)
    if (ctx.chat.id in dicc) {
        var chatScores = dicc[ctx.chat.id]

        var answer = name + "\n"
        var tuples = [];

        for (var key in chatScores)
            tuples.push([chatScores[key].user, chatScores[key].p, chatScores[key].m]);

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
    }
}

var findName = function(chatId, id) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/voters");
    var voters = JSON.parse(buffer)
    //var path = process.cwd();
    var buffer = fs.readFileSync(path + "/dict");
    var dict = JSON.parse(buffer)
    var chatVoters = getFrom(voters, chatId)
    var chatScores = getFrom(dict, chatId)
    if (id in chatVoters)
        return chatVoters[id].user
    else if (id in chatScores)
        return chatScores[id].user
    return "Unknown"
}

var showTopFromGraph = function(ctx) {
    var path = process.cwd();
    var buffer = fs.readFileSync(path + "/graph");
    var graph = JSON.parse(buffer)

    var tuples = [];
    if (ctx.chat.id in graph) {

        var chatGraph = graph[ctx.chat.id]

        for (var from in chatGraph) {
            for (var to in chatGraph[from]) {
                tuples.push([findName(ctx.chat.id, from), findName(ctx.chat.id, to), chatGraph[from][to]])
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

var conto = (chatid, msg) => {
  var msgid = msg.message_id
  console.log(msgid)
  var lines = fs.readFileSync('./log', 'utf-8').split(/\r?\n/)
  
  for (var i in lines) {
    var line = lines[i]
    
    if (line.split(" ")[1] == chatid && line.split(" ")[3] == msgid)
      return true
  }
  return false
}

/*bot.command('scoreboard', (ctx) => showScoreboard(ctx))
bot.command('scoreboard@thumbsup_score_bot', (ctx) => showScoreboard(ctx))*/

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