var apiKey;

export default {

    setApiKey(newApiKey){
        apiKey = newApiKey
    },

    async sendMessage(chatId, text){
        const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
        const data = await fetch(url).then(resp => resp.json());
    },

    async deleteMessage(chatId, message_id){
        const url = `https://api.telegram.org/bot${apiKey}/deleteMessage?chat_id=${chatId}&message_id=${message_id}`;
        const data = await fetch(url).then(resp => resp.json());
    },

}
