import telebot
from os import environ
from telebot import types
import random
import requests
import time
import jsonpickle
from strings import *
DATAMUSE = "http://api.datamuse.com/words"

#DOC: https://pypi.org/project/pyTelegramBotAPI/
bot = telebot.TeleBot(environ['TELEGRAM_TOKEN'])

bot_text = "Bienvenides!"

status = {}

def save():
  pass
  with open('status.json', 'w') as outfile:  
     outfile.write(jsonpickle.encode(status, keys = True))

def restore():
  pass
  global status
  with open('status.json') as infile:
    status = jsonpickle.decode(infile.read(), keys = True)
  print ("Restore")

def desambiguar(id):
  return [group for group in status if id in status[group].scores]

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
	bot.reply_to(message, bot_text)

def strip_accents(string, accents=('COMBINING ACUTE ACCENT', )):
    accents = set(map(unicodedata.lookup, accents))
    chars = [c for c in unicodedata.normalize('NFD', string) if c not in accents]
    return unicodedata.normalize('NFC', ''.join(chars))
  
import unicodedata
@bot.message_handler(func = lambda m: True)
def echo_all(message):
  
  msgtext = message.text
  if len(status) == 0: 
    restore() #se cayó el bot y hay que volver desde status.json 
  group = None
  if message.chat.type == "private":
    
    #para votar y mandar definiciones
    #hay que buscar en todos los grupos en cuál está el jugador, que no va poder participar en 2 juegos a la vez
    #el tema de siempre bah
    ag = desambiguar(message.from_user.id)
    if len(ag) == 0:
      return
    elif len(ag)== 1:
      group = ag[0]
    else:
      bot.send_message(message.from_user.id, "There is more than one active group for your user")
      return
    pass
  else:
    group = message.chat.id

  if msgtext == "/alive":
    print("yes")
    
  if (msgtext == "/debug" and group in status):
    #acá no hay self, usamos status[group]
    print("self.scores :")
    print(status[group].scores) 
    print("self.users :")
    print(status[group].users)
    print("self.word :")
    print(status[group].word)
    print("self.definitions :")
    print(status[group].definitions)
    print("self.def_scores :")
    print(status[group].def_scores)
    print("self.phase :")
    print(status[group].phase)
    print("self.grupo :")
    print(status[group].grupo)
    print("self.usersqueue :")
    print(status[group].usersqueue)
  
  print (status)
  print (group)
  if group not in status:
    print ("Reset")
    status[group] = game(group)
    
  if (msgtext == "/force_end"):
    status[group] = game(group)
    
  if (msgtext == "/phase"):
    bot.send_message(group, "Fase "+ str(status[group].phase) + " completa, Santos.\nO sea, " + phase_number_to_readable(status[group].phase))
    
  if (msgtext == "/leave"):
    status[group].removeUser(message.from_user.id)
    
  if status[group].phase == 0: #la parte que si hiciera un state de verdad le sacaría el switch (que python ni tiene switch)
      status[group].phase0(message, msgtext)
  elif status[group].phase == 1:
      status[group].phase1(message, msgtext)
  else:
      status[group].phase2(message, msgtext)
      
  save()
       
def randomWord():
  
    i = "abcdefghijklmnñopqrstuvwxyz"[random.randint(0, 26)]
  
    language = "&v=es"
    print(DATAMUSE + "?max=15&sp=" + i + "*" + language + "&md=d")
    r = requests.get(DATAMUSE + "?max=15&sp=" + i + "*" + language + "&md=d")
    answers = r.json()
    answer, definition = ("None", "None")
    found = 0
    while not found:
      if (len(answers) > 0):
        j = random.randint(0, len(answers) - 1)
        print (answers, j)
        print (answers[j])
        if (len(answers[j]["word"]) > 3 and not " " in answers[j]["word"] and "defs" in answers[j]):
          definition = format(answers[j]["defs"][0].split('\t')[1])
          definition = definition.replace("( ", "(").replace(" )", ")")
          print(answers[j]["word"])
          answer = format(answers[j]["word"])
          found = 1
        answers.pop(j)
      else: return randomWord()
  
    return (answer.upper(), definition)
    
class game():
  
  def __init__(self, grupo):
    self.scores = {} #y de paso players con las keys
    self.users = {}
    self.word = None # palabra a definir
    self.definitions = {} #la definicion para cada jugador
    self.def_scores = {} #los votos en esta ronda para cada jugador (no es necesario pero está bueno, incluso podemos mostrar quién votó que cosa)
    self.phase = 0
    self.grupo = grupo
    self.usersqueue = set([])
    self.leftToVote = []

  def phase0(self, ctx, msgtext):
    if ("/join" in msgtext):
      try:
        if ctx.from_user.id in self.users: 
          bot.send_message(ctx.from_user.id, "Ya habías joineado, gil")
        else:
          bot.send_message(ctx.from_user.id, "Joineaste amigue, felicidades!")
          self.scores[ctx.from_user.id] = 0
          self.users[ctx.from_user.id] = ctx.from_user
      except:
        bot.send_message(self.grupo, "Error, ¿me starteaste ya?")
    if ("/startgame" in msgtext):
      self.initphase1()
      bot.send_message(ctx.chat.id, "Game starteado")
      
  def encolarUser(self, user):
      if user.id in self.users: 
        bot.send_message(ctx.from_user.id, "Ya habías joineado, gil")
      else:
        self.usersqueue.add(user)
        bot.send_message(self.grupo, "OK, cuando termine la ronda te agrego")
      
  def initphase1(self):
      for user in self.usersqueue:
        self.scores[user.id] = 0
        self.users[user.id] = user
        bot.send_message(user.id, "Joineaste gil")
      self.usersqueue = set([])
      self.phase = 1
      self.word, definition = randomWord()
      self.definitions = {"POSTA": definition}
      self.def_scores = {}
      for player in self.scores:
        bot.send_message(player, "Mandá una definición para " + self.word)

  def phase1(self, ctx, msgtext):
    
    if (ctx.chat.type != "private"): 
      if ("/join" in msgtext):
        self.encolarUser(ctx.from_user)
      if ("/hurry" in msgtext):
        bot.send_message(self.grupo, "Lxs siguientes giles no han enviado sus definiciones todavía:")
        s = ""
        for player in self.users:
          print (player)
          if player not in self.definitions:
            s += " " + mentionUser(self.users[player])
        bot.send_message(self.grupo, s, parse_mode="Markdown")
      if ("/meaburri" in msgtext):
        self.initphase2()
      return    
    
    self.definitions[ctx.from_user.id] = format(msgtext) #podríamos guardarnos id para forwardear para decir de quien es cada uno pero paja
    self.def_scores[ctx.from_user.id] = 0 
    #eso pisa, podía hacer que solo se pueda una vez
    if len([player for player in self.scores if player not in self.definitions]) == 0: #"no hay jugadores sin definir"
      self.initphase2()
  
  def initphase2(self):
    self.phase = 2
    for player in self.scores:
        #muestra keyboard (convendría abstraer)
        markup = types.ReplyKeyboardMarkup(row_width = 1, one_time_keyboard = True)
        for playerdef in self.definitions:
          if player != playerdef:
            itembtn1 = types.KeyboardButton(self.definitions[playerdef])
            markup.add(itembtn1)
        bot.send_message(player, "Votá una definición", reply_markup = markup)
    self.leftToVote = list(self.scores.keys())
    
  def phase2(self, ctx, msgtext):
    if (ctx.chat.type != "private"):
      if "/join" in msgtext:
        self.encolarUser(ctx.from_user)
      if "/hurry" in msgtext:
        bot.send_message(self.grupo, "Lxs siguientes giles no han votado todavía:")
        s = ""
        for player in self.leftToVote:
          s += mentionUser(self.users[player]) + " "
        bot.send_message(self.grupo, s, parse_mode="Markdown") 
      if "/meaburri" in msgtext:
        self.leftToVote = []
        self.endPhase2()
      return

    if (ctx.from_user.id not in self.leftToVote): return
    #chequea que el mensaje sea una de las definiciones (y no la propia), si 2 mandan la misma puede fallar
    votedList = [player for player in self.definitions if self.definitions[player] == msgtext]
    if len(votedList) == 0 or votedList[0] == ctx.from_user.id:
      bot.send_message(ctx.from_user.id, "Elegí una definición de la lista, te hacés el vivo, gil??")
      return
    
    self.leftToVote.remove(ctx.from_user.id)
    voted = votedList[0]
    if voted == "POSTA":
      self.scores[ctx.from_user.id] += 2
      bot.send_message(ctx.from_user.id, "Le pegaste")
    else:
      self.def_scores[voted] += 1
      bot.send_message(ctx.from_user.id, "Pifiaste")
    if (len(self.leftToVote) == 0): #timeoutear también
      self.endPhase2()
      
      
  def endPhase2(self):
    time.sleep(2)
    bot.send_message(self.grupo, 'La definición correcta era "' + self.definitions["POSTA"] + '"')
    s = "Votos recibidos:\n"
    
    results = [(player, self.definitions[player], self.def_scores[player]) for player in self.def_scores]
    results.sort(key = lambda tup: -tup[2]) #sort por la 3er componente - el score
    
    for res in results:
       s += self.users[res[0]].first_name + ': "' + str(res[1]) + '" - ' + str(res[2]) + "\n"
    
   # for player in self.def_scores:
    #  s += str(player)+': "'+str(self.definitions[player]) + " - " + str(self.def_scores[player]) + "\n"
    bot.send_message(self.grupo, s)

    s = "Puntajes:\n"

    for player in self.def_scores:
      self.scores[player] += self.def_scores[player]

    for (player, score) in sorted(self.scores.items(), key = lambda kv:(kv[1], kv[0]))[::-1]:
      s += self.users[player].first_name + ": " + str(score) + "\n"
    bot.send_message(self.grupo, s)
    time.sleep(2)
    self.initphase1()
    
  def removeUser(self, id):
    if id not in self.scores: return
    bot.send_message(self.grupo, "You left this game. Use /join to rejoin. You score will be lost")  
    self.scores.pop(id, None)
    self.users.pop(id, None)
    self.definitions.pop(id, None)
    if len([user for user in self.users if user not in self.definitions]) == 0 and self.phase == 2:
      pass
    self.def_scores.pop(id, None)
    self.leftToVote.pop(id, None)
    if len(self.leftToVote) == 0 and self.phase == 2:
      pass
    
  #falta que si era el ultimo que faltaba para avanzar se avance
  #habría que buscar también el callback de user left así cuando un user se va del grupo lo rajamos
      
	#bot.reply_to(message, message.text)
  
bot.set_webhook("https://{}.glitch.me/{}".format(environ['PROJECT_NAME'], environ['TELEGRAM_TOKEN']))

# ================= UTILS ================

def phase_number_to_readable(phase):
  # 0: esperando que joineen y starteen
  # supongo que deberían anotarse todos, no lo podemos hacer best effort como el contacto
  # elegimos una palabra (sale reusar el código de buscar en datamuse)
  # 1: esperando que todos pongan su definición
  # ponen su definición o timeout
  # 2: esperando que voten
  # votan entre todas las definiciones (botones + validación de que coincida, tengo algo para eso también)
  # reparten puntos (2 o 3 para el que acierta, 1 por cada uno que se creyó tu def)
  # back to 1
  # ver cuando termina también
  if phase == 0:
    return "esperando que joineen y starteen"
  
  if phase == 1:
    return "esperando que todos pongan su definición"
  
  if phase == 2:
    return "esperando que voten"