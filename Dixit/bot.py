import telebot
from os import environ
from telebot import types
import random
import time
import jsonpickle
from io import BytesIO
from PIL import Image
import requests
import numpy as np

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
  
def send_photos(chatid, imgurls):
  list_im = []
  
  for url in imgurls:
    response = requests.get(url)
    img = BytesIO(response.content)
    list_im.append(img)
    
  imgs = [Image.open(i) for i in list_im]
  # pick the image which is the smallest, and resize the others to match it (can be arbitrary image shape here)
  min_shape = sorted([(np.sum(i.size), i.size) for i in imgs])[0][1]
  try:
    imgs_comb = np.hstack([np.asarray(i.resize(min_shape)) for i in imgs])
    imgs_comb = Image.fromarray(imgs_comb)
    
    bio = BytesIO()
    bio.name = 'image.jpeg'
    imgs_comb.save(bio, 'JPEG')
    bio.seek(0)
    bot.send_photo(chatid, photo = bio)
  except:
    print(status[-258588711].manos[chatid])

from PIL import ImageDraw
def send_photos2(chatid, imgurls, votes, authors):
  list_im = []
  
  for url in imgurls:
    response = requests.get(url)
    img = BytesIO(response.content)
    list_im.append(img)
    
  imgs = [Image.open(i) for i in list_im]
  # pick the image which is the smallest, and resize the others to match it (can be arbitrary image shape here)
  min_shape = (114, 167) #sorted([(np.sum(i.size), i.size) for i in imgs])[0][1]
  imgs_resized = []
  for i in range(len(imgs)):
    img_resized = imgs[i].resize(min_shape)
    d = ImageDraw.Draw(img_resized)
    d.text((10,10), str(votes[i]), fill=(255,255,0))
    d.text((10,20), authors[i], fill=(255,255,0))
    imgs_resized.append(img_resized)
  
  try:
    imgs_comb = np.hstack([np.asarray(i) for i in imgs_resized])
    imgs_comb = Image.fromarray(imgs_comb)
    
    bio = BytesIO()
    bio.name = 'image.jpeg'
    imgs_comb.save(bio, 'JPEG')
    bio.seek(0)
    bot.send_photo(chatid, photo = bio)
  except:
    print(status[-258588711].manos[chatid])

urls = [
  "https://cdn.glitch.com/7ce740c2-ba20-4cc4-8e40-661d54b24761%2FDixit" + str(i) + ".png" for i in range(1, 17)
]
urls[9] = "https://cdn.glitch.com/7ce740c2-ba20-4cc4-8e40-661d54b24761%2FDixit10.jpg?v=1562703231326"

@bot.message_handler(func = lambda m: True)
def echo_all(message):
  msgtext = message.text
  
  print (message.message_id)
  
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
    print("self.otherimgs :")
    print(status[group].chosenimgs)
    print("self.def_scores :")
    print(status[group].def_scores)
    print("self.phase :")
    print(status[group].phase)
    print("self.grupo :")
    print(status[group].grupo)
    print("self.opciones:")
    print(status[group].opciones)
    print("self.leftToVote:")
    print(status[group].leftToVote)
    '''print("self.usersqueue :")
    print(status[group].usersqueue)'''
  
  print (status)
  print (group)
  if group not in status:
    print ("Reset")
    status[group] = game(group)
    
  if (msgtext == "/force_end"):
    status[group] = game(group)
    
  if (msgtext == "/phase"):
    bot.send_message(group, str(status[group].phase) + ": " + phase_number_to_readable(status[group].phase))
    
  #if (msgtext == "/leave"):
  #  status[group].removeUser(message.from_user.id)
    
  if status[group].phase == -1: #la parte que si hiciera un state de verdad le sacaría el switch (que python ni tiene switch)
      status[group].phasemenos1(message, msgtext)
  elif status[group].phase == 0: 
      status[group].phase0(message, msgtext)
  elif status[group].phase == 0.5: 
      status[group].phase0_5(message, msgtext)
  elif status[group].phase == 1:
      status[group].phase1(message, msgtext)
  else:
      status[group].phase2(message, msgtext)
      
  save()
  
def format(s):
  return s[0].upper() + s[1:].lower()

def numberKeyboard(n):
  markup = types.ReplyKeyboardMarkup(one_time_keyboard = True, row_width = 100, resize_keyboard = True)
  buttons = [types.KeyboardButton(str(i)) for i in range(1, n + 1)]
  markup.add(*buttons)
  return markup
      
class game():
  
  def __init__(self, grupo):
    self.scores = {} #y de paso players con las keys
    self.users = {}
    self.chosenimgs = {} #la definicion para cada jugador
    self.def_scores = {} #los votos en esta ronda para cada jugador (no es necesario pero está bueno, incluso podemos mostrar quién votó que cosa)
    self.phase = -1
    self.grupo = grupo
    #self.usersqueue = set([])
    self.leftToVote = []
    self.manos = {}
    self.storyteller = 0
    self.definition = None
    self.opciones = {}
    
  def getST(self):
    return list(self.users.keys())[self.storyteller % len(self.users)]

  def phasemenos1(self, ctx, msgtext):
    if ("/join" in msgtext):
      try:
        if ctx.from_user.id in self.users: 
          bot.send_message(ctx.from_user.id, "Ya habías joineado")
        else:
          bot.send_message(ctx.from_user.id, "Joineaste")
          self.scores[ctx.from_user.id] = 0
          self.users[ctx.from_user.id] = ctx.from_user
      except:
        bot.send_message(self.grupo, "Error, ¿me starteaste ya?")
    if ("/startgame" in msgtext):
      N = len(urls)
      
      mazo = list(range(N))
      random.shuffle(mazo)
      i = 0
      cartasenmano = N//len(self.scores)
      for player in self.scores:
        self.manos[player] = mazo[i * cartasenmano : (i + 1) * cartasenmano]
        i += 1
      bot.send_message(ctx.chat.id, "Game starteado")
      self.initphase0()
      
  def initphase0(self):
    self.storyteller += 1 
    
    opciones = [urls[id] for id in self.manos[self.getST()]]
    send_photos(self.getST(), opciones)
    print(opciones)
    markup = numberKeyboard(len(opciones))
    bot.send_message(self.getST(), "Elegí la carta para la próxima ronda", reply_markup = markup)      
    self.phase = 0
    
  def phase0(self, ctx, msgtext):
    if ("/hurry" in msgtext):
      s = mentionUser(self.users[self.getST()])
      bot.send_message(self.grupo, s, parse_mode="Markdown")
    if (ctx.from_user.id != self.getST()): return
    if (ctx.chat.type != "private"): return
    try:
      self.chosenimgs = {self.getST(): self.manos[self.getST()].pop(int(msgtext) - 1)}
      bot.send_message(self.getST(), "Elegí la definición para la próxima ronda")
      self.phase = 0.5
    except:
      bot.send_message(self.getST(), "Error")
    
  def phase0_5(self, ctx, msgtext):
    if ("/hurry" in msgtext):
        s = mentionUser(self.users[self.getST()])
        bot.send_message(self.grupo, s, parse_mode="Markdown") 
    if (ctx.from_user.id != self.getST()): return
    if (ctx.chat.type != "private"): return
    if (" " in msgtext): 
      bot.send_message(self.getST(), "Una sola palabra plis")
      return
    self.definition = msgtext
    self.initphase1()
    self.def_scores[ctx.from_user.id] = 0 
    #validar que no tenga espacios
  
  '''def encolarUser(self, user):
      if user.id in self.users: 
        bot.send_message(ctx.from_user.id, "Ya habías joineado")
      else:
        self.usersqueue.add(user)
        bot.send_message(self.grupo, "OK, cuando termine la ronda te agrego")'''
      
  def initphase1(self):
      '''for user in self.usersqueue:
        self.scores[user.id] = 0
        self.users[user.id] = user
        bot.send_message(user.id, "Joineaste gil")
      self.usersqueue = set([])'''
      self.phase = 1
      self.def_scores = {}
      for player in self.scores:
        if player == self.getST(): continue
        opciones = [urls[id] for id in self.manos[player]]
        send_photos(player, opciones)
        markup = numberKeyboard(len(opciones))
        bot.send_message(player, "Mandá una card para " + self.definition, reply_markup = markup)      

  def phase1(self, ctx, msgtext):

    if (ctx.chat.type != "private"): 
      '''if ("/join" in msgtext):
        self.encolarUser(ctx.from_user)'''
      if ("/hurry" in msgtext):
        #bot.send_message(self.grupo, "Lxs siguientes giles no han enviado sus cards todavía:")
        s = ""
        for player in self.users:
          print (player)
          if player not in self.chosenimgs:
            s += " " + mentionUser(self.users[player])
        bot.send_message(self.grupo, s, parse_mode="Markdown")
      if ("/meaburri" in msgtext):
        self.initphase2()
      return
    
    if (ctx.from_user.id == self.getST()): return
    
    try:
      self.chosenimgs[ctx.from_user.id] = self.manos[ctx.from_user.id].pop(int(msgtext) - 1) 
      #podríamos guardarnos id para forwardear para decir de quien es cada uno pero paja
      self.def_scores[ctx.from_user.id] = 0 
      #eso pisa, podía hacer que solo se pueda una vez
      if len([pl for pl in self.scores if pl not in self.chosenimgs and pl != self.getST()]) == 0: #"no hay jugadores sin definir"
        self.initphase2()
    except:
      pass
  
  def initphase2(self):
    self.phase = 2
    for player in self.scores:
        if player == self.getST(): continue
        #muestra keyboard (convendría abstraer)
        self.opciones[player] = [self.chosenimgs[pl] for pl in self.def_scores if pl != player]
        send_photos(player, [urls[i] for i in self.opciones[player]])
        markup = numberKeyboard(len(self.opciones[player]))
        bot.send_message(player, "Votá una card para " + self.definition, reply_markup = markup)
    self.leftToVote = list(self.scores.keys())
    self.leftToVote.remove(self.getST())
    
  def phase2(self, ctx, msgtext):
    if (ctx.chat.type != "private"):
      '''if "/join" in msgtext:
        self.encolarUser(ctx.from_user)'''
      if "/hurry" in msgtext:
        #bot.send_message(self.grupo, "Lxs siguientes giles no han votado todavía:")
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
    try:
      vote = self.opciones[ctx.from_user.id][int(msgtext) - 1]
      votedList = [player for player in self.chosenimgs if self.chosenimgs[player] == vote]
      if len(votedList) == 0 or votedList[0] == ctx.from_user.id:
        bot.send_message(ctx.from_user.id, "Elegí una card de las que mandaron")
        return
    except:
      bot.send_message(ctx.from_user.id, "Elegí una card de las que mandaron")
      return
    
    self.leftToVote.remove(ctx.from_user.id)
    voted = votedList[0]
    if voted == self.getST():
      self.def_scores[voted] += 1
      #self.scores[ctx.from_user.id] += 3
      bot.send_message(ctx.from_user.id, "Le pegaste")
    else:
      self.def_scores[voted] += 1
      bot.send_message(ctx.from_user.id, "Pifiaste")
    if (len(self.leftToVote) == 0): #timeoutear también
      self.endPhase2()
      
      
  def endPhase2(self):
    time.sleep(2)
    bot.send_message(self.grupo, 'La card correcta era: ')
    send_photos(self.grupo, [urls[self.chosenimgs[self.getST()]]])
    s = "Votos recibidos:\n"
    
    results = [(player, urls[self.chosenimgs[player]], self.def_scores[player]) for player in self.def_scores]
    results.sort(key = lambda tup: -tup[2]) #sort por la 3er componente - el score
    
    #for res in results:
    #   send_photos(self.grupo, [res[1]])
    #   s = self.users[res[0]].first_name + ': ' + str(res[2]) + "\n"
    #   bot.send_message(self.grupo, s)
    
    send_photos2(self.grupo, [i[1] for i in results], [i[2] for i in results], [self.users[res[0]].first_name for res in results])
    
   # for player in self.def_scores:
    #  s += str(player)+': "'+str(self.otherimgs[player]) + " - " + str(self.def_scores[player]) + "\n"
    
    if (self.def_scores[self.getST()] == len(self.scores) - 1):
      bot.send_message(self.grupo, "Todos eligieron la del storyteller. Son 2 puntos para cada jugador")
      for player in self.def_scores:
        self.scores[player] += (player != self.getST()) * 2
      
      '''elif (self.def_scores[getST()] == 0):
        bot.send_message(self.grupo, "Nadie eligió la del storyteller. Son 2 puntos para cada jugador")  
        for player in self.def_scores:
          self.scores[player] += (player == self.getST()) * 2
        for player in self.def_scores:
          self.scores[player] += self.def_scores[player]'''

    else: 
      for player in self.def_scores:
        self.scores[player] += self.def_scores[player]
        
    s = "Puntajes:\n"

    for (player, score) in sorted(self.scores.items(), key = lambda kv:(kv[1], kv[0]))[::-1]:
      s += self.users[player].first_name + ": " + str(score) + "\n"
    bot.send_message(self.grupo, s)
    time.sleep(2)
    
    if len(self.manos[self.getST()]) == 0:
      bot.send_message(self.grupo, "Game over")
      player = sorted(self.scores.items(), key = lambda kv:(kv[1], kv[0]))[::-1][0][0]
      bot.send_message(self.grupo, "Felicitaciones " + self.users[player].first_name + " sos el más capo")
      self.scores = {}
      self.users = {}
      self.chosenimgs = {}
      self.def_scores = {}
      self.phase = -1
    else:
      self.initphase0()
    
  '''def removeUser(self, id):
    if id not in self.scores: return
    bot.send_message(self.grupo, "You left this game. Use /join to rejoin. You score will be lost")  
    self.scores.pop(id, None)
    self.users.pop(id, None)
    self.chosenimgs.pop(id, None)
    if len([user for user in self.users if user not in self.chosenimgs]) == 0 and self.phase == 2:
      pass
    self.def_scores.pop(id, None)
    self.leftToVote.pop(id, None)
    if len(self.leftToVote) == 0 and self.phase == 2:
      pass
    '''
  #falta que si era el ultimo que faltaba para avanzar se avance
  #habría que buscar también el callback de user left así cuando un user se va del grupo lo rajamos
      
	#bot.reply_to(message, message.text)
  
bot.set_webhook("https://{}.glitch.me/{}".format(environ['PROJECT_NAME'], environ['TELEGRAM_TOKEN']))

# ================= UTILS ================

def mentionUser(user):
  try:
    return "@" + user.username
  except:
    return "[" + user.first_name + "](tg://user?id=" + str(user.id) + ")"

def phase_number_to_readable(phase):
  if phase == -1:
    return "esperando que joineen y starteen"
  
  # repartimos las cartas
  # esto es, seteamos ids para cada uno
  # y le mandamos a cada uno la imagen de lo que tiene
  # seteamos primer storyteller
  
  if phase == 0:
    return "esperando que el storyteller elija su card"
  
  if phase == 0.5:
    return "esperando que el storyteller ponga la definición"
  
  #elige. Le popeamos esa carta de la mano. También tiene que mandar una definición (de 1 palabra)
  if phase == 1:
    return "esperando que todos pongan su card"
  
  #todos ponen su card (la popeamos de la mano)
  #mostramos las imágenes que se eligieron
  if phase == 2:
    return "esperando que voten"
  
  #distribuimos puntos y volvemos a 0 (le mandamos a cada uno la img de lo que tiene de vuelta)
  #O si todos se quedan sin cartas terminamos y volvemos a -1 (gurdándonos quieres eran y con una opcion de restart same players)