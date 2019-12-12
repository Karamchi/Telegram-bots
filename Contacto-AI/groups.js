const fs = require('fs');

var groups = {}
var SELF = 504979973

var rmRelation = (idperson, idchat) => {
    if (idperson in groups) {
      var index = groups[idperson].indexOf(idchat)
      if (index != -1) {
        groups[idperson].splice(index, 1)
      }
    } 
}

exports.onLeftChatMember = (ctx) => {
    //path = process.cwd();
    var buffer = fs.readFileSync("./groups.txt", "utf8");
    groups = JSON.parse(buffer)
    var left = ctx.message.left_chat_participant.id
    if (left == SELF)
      for (var key in groups) {
        rmRelation(key, ctx.message.chat.id)
      }
    else
      rmRelation(left, ctx.message.chat.id)
    fs.writeFile("./groups.txt", JSON.stringify(groups), function(err) {});
}

exports.saveRelation = (idperson, idchat) => {
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

exports.onNewChatMembers = (ctx) => {
    if (ctx.message.new_chat_participant.id != SELF) {
        exports.saveRelation(ctx.message.new_chat_participant.id, ctx.message.chat.id)
    }
}

exports.groups = () => {
  var buffer = fs.readFileSync("./groups.txt", 'utf8');
  console.log(buffer)
  try {
    groups = JSON.parse(buffer)
  } catch (error) {
    console.log("Error leyendo grupos")
  }
  return groups
}