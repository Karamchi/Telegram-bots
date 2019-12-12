var messagequeue = []
var messageqbusy = false
var bot = undefined
const http = require('http');
var timeout = undefined

exports.setBot = bots => bot = bots

exports.sendMessage = (chat, message) => {
  messagequeue.push({chat: chat, message: message})
  if (!messageqbusy) {
    timeout = setTimeout(sendNextMessage, 1500)
  }
  messageqbusy = true
}

exports.reply = (ctx, message) => {
  exports.sendMessage(ctx.message.chat.id, message)
}

var sendNextMessage = () => {
  var c = messagequeue[0]
  if (messagequeue.length == 0) return
  exports.sendMessageMD(c.chat, c.message)
  messagequeue.shift()
  if (messagequeue.length == 0) {
    messageqbusy = false
  } else {
    //messageqbusy = true
    timeout = setTimeout(sendNextMessage, 3000)
  }
}

exports.sendMessageMD = (chat, text) => {
  bot.telegram.sendMessage(chat, text, {parse_mode:"Markdown"})
  
  .then((message) =>
  
    http.get("http://contacto-bot.glitch.me/burn?msg=" + text + "&chat=" + chat, (response) => {
        if (response.statusCode == 200) {
          clearTimeout(timeout)
          messagequeue = []
          messageqbusy = false
        }
    })
  )
}