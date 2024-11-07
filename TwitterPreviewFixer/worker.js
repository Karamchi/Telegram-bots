import bot from "./bot.js";

export default {

  async fetch(request, env, ctx) {
    bot.setApiKey(env.API_KEY)

    if(request.method === "POST"){
        const payload = await request.json();
        if('message' in payload && payload.message.text != undefined){
            await this.onText(payload)
        }
    }

    return new Response('OK');
  },

  async onText(ctx) {

    var msgtext = ctx.message.text

    if (msgtext.includes("x.com") && !msgtext.includes("stupidpenis")) {
      var id = ctx.message.message_id
      var newText = ctx.message.from.username + ": " +
        msgtext.replace("x.com", "stupidpenisx.com").replace("\n", "%0A")

      await bot.sendMessage(ctx.message.chat.id, newText)
      await bot.deleteMessage(ctx.message.chat.id, id)
    }

    return 1
  }
}

