import flask, telebot
from bot import bot

app = flask.Flask(__name__)
WEBHOOK_URL_PATH = "/{}".format(bot.token)

# Process index page
@app.route('/')
def root():
    print('index!')
    
    #horizontal(urls)
    return flask.render_template("index.html", user_image = 'static/Trifecta.jpg')# index # 'xd' # flask.send_from_directory('/static', 'index.html')
  
# Process webhook calls
@app.route(WEBHOOK_URL_PATH, methods=['POST'])
def webhook():
    if flask.request.headers.get('content-type') == 'application/json':
        json_string = flask.request.get_data().decode('utf-8')
        update = telebot.types.Update.de_json(json_string)
        bot.process_new_updates([update])
        return ''
    else:
        flask.abort(403)

if __name__ == "__main__":
  
  app.run()
