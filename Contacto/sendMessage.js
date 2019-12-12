var messagequeue = []
var messageqbusy = false
var bot = undefined

exports.setBot = bots => bot = bots

exports.sendMessage = (chat, message) => {
  messagequeue.push({chat: chat, message: message})
  if (!messageqbusy) {
    setTimeout(sendNextMessage, 150)
  }
  messageqbusy = true
}

exports.reply = (ctx, message) => {
  exports.sendMessage(ctx.message.chat.id, message)
}

var sendNextMessage = () => {
  var c = messagequeue[0]
  exports.sendMessageMD(c.chat, c.message)
  messagequeue.shift()
  if (messagequeue.length == 0) {
    messageqbusy = false
  } else {
    //messageqbusy = true
    setTimeout(sendNextMessage, 500)
  }
}

exports.sendMessageMD = (chat, text) => {
  bot.telegram.sendMessage(chat, text, {parse_mode:"Markdown"})
}