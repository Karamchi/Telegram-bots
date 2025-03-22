import telebot
from os import environ
from telebot import types
import random
import time
import jsonpickle
from strings import *

#DOC: https://pypi.org/project/pyTelegramBotAPI/
#no anda lo del parse mode ni todo maýús ni la primera en mayús
bot = telebot.TeleBot(environ['TOKEN'], parse_mode="markdown")

bot_text = "Bienvenides!"

status = {}

descr = ["",
  "Name a non-Guard card and choose another player. If that player has that card, he or she is out of the round.",
  "Look at another player's hand.",
  "You and another player secretly compare cards. The player with the lower value is out of the round.",
  "Until your next turn, ignore all effects from other players' cards.",
  "Choose any player (including yourself) to discard his or her card and draw a new card.",
  "Trade hands with another player of your choice.",
  "If you have this card and the King or Prince in your hand, you must discard this card.",
  "If you discard this card, you are out of the round."
]

def save():
  with open('status.json', 'w') as outfile:  
     outfile.write(jsonpickle.encode(status, keys = True))

def restore():
  global status
  with open('status.json') as infile:
    status = jsonpickle.decode(infile.read(), keys = True)
  print ("Restore")

def desambiguar(id):
  return [group for group in status if id in status[group].scores]

@bot.message_handler(commands=['start'])
def send_welcome(message):
	bot.reply_to(message, bot_text)

def strip_accents(string, accents=('COMBINING ACUTE ACCENT', )):
    accents = set(map(unicodedata.lookup, accents))
    chars = [c for c in unicodedata.normalize('NFD', string) if c not in accents]
    return unicodedata.normalize('NFC', ''.join(chars))
  
import unicodedata

def printCarta(carta):
  #return str(carta)
  return str(carta) + " - " + ["GUARD", "PRIEST", "BARON", "HANDMAID", "PRINCE", "KING", "COUNTESS", "PRINCESS"][carta - 1]

def printCartaInv(text):
  for i in range(1, 9):
    if (printCarta(i) == text): 
      return i
  return text

  #"**" + str(carta) + " - " + ["GUARD", "PRIEST", "BARON", "HANDMAID", "PRINCE", "KING", "COUNTESS", "PRINCESS"][carta - 1] + "**"

@bot.message_handler(func = lambda m: True)
def echo_all(message):
  #bot.reply_to(message, message.text)
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

  if "/help" in msgtext:
    opciones = ["/quehace " + printCarta(opcion) for opcion in range(1, 9)]
    print (opciones)
    keyboard(message.chat, "Clickear para ver qué hace", opciones) 

  if "/quehace" in msgtext:
    try: 
      msgtext = int(msgtext[len("/quehace") + 1])
      bot.send_message(message.chat.id, descr[msgtext])
    except: return

  if (msgtext == "/debug" and group in status):
    #acá no hay self, usamos status[group]
    print("self.scores :")
    print(status[group].scores) 
    print("self.users :")
    print(status[group].users)
    print("self.livingUsers :")
    print(status[group].livingUsers)
    print("self.protectedUsers :")
    print(status[group].protectedUsers)
    print("self.opciones :")
    print(status[group].opciones)
    print("self.mazo :", status[group].mazo)
    print("self.jugada :",  status[group].jugada)
    print("self.phase :")
    print(status[group].phase)
    print("self.manos :")
    print(status[group].manos)
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
  else:
      status[group].phase1(message, msgtext)
      
  save()
       
def keyboard(player, msg, opciones):
  markup = types.ReplyKeyboardMarkup(row_width = 1, one_time_keyboard = True)

  for opcion in opciones:
    itembtn1 = types.KeyboardButton(opcion)
    markup.add(itembtn1)
  bot.send_message(player.id, msg, reply_markup = markup)
    
class game():
  
  def __init__(self, grupo):
    self.scores = {} #y de paso players con las keys
    self.users = {}
    self.phase = 0
    self.grupo = grupo
    self.usersqueue = set([])

    self.livingUsers = set([])
    self.protectedUsers = set([])
    self.manos = {}
    self.turno = 0
    self.jugada = []
    self.mazo = []
    self.opciones = []

  def getST(self):
    return self.users[list(self.scores)[self.turno]]

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
      bot.send_message(ctx.chat.id, "Game starteado")
      self.initphase1()
      
  def encolarUser(self, user):
      if user.id in self.users: 
        bot.send_message(user.id, "Ya habías joineado, gil")
      else:
        self.usersqueue.add(user)
        bot.send_message(self.grupo, "OK, cuando termine la ronda te agrego")

  def initphase1(self):
    self.initRonda()
      
  def initRonda(self):
    #agregar pendientes
    for user in self.usersqueue:
      self.scores[user.id] = 0
      self.users[user.id] = user
      bot.send_message(user.id, "Joineaste gil")
    self.usersqueue = set([])
    self.phase = 1
    bot.send_message(self.grupo, "Mezclando y repartiendo...")
    self.mazo=[1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8]
    random.shuffle(self.mazo)
    for player in self.scores:
      self.manos[player] = self.mazo.pop()
      bot.send_message(player, "Tenés un " + printCarta(self.manos[player]))
    self.livingUsers = list(self.scores)
    self.protectedUsers = []
    self.endTurno()

  def initTurno(self, player):
    self.jugada = []
    if player.id in self.protectedUsers: self.protectedUsers.remove(player.id)
    carta_robada = self.mazo.pop()
    bot.send_message(self.grupo, player.first_name + " roba una carta, quedan " + str(len(self.mazo) - 1) + " en el mazo")
    bot.send_message(player.id, "Recibiste un " + printCarta(carta_robada))
    self.manos[player.id] = [self.manos[player.id], carta_robada]
    
    self.opciones = self.manos[player.id][:]
    if 7 in self.opciones:
      if 5 in self.opciones: self.opciones.remove(5)
      if 6 in self.opciones: self.opciones.remove(6)
    
    if 8 in self.opciones: self.opciones.remove(8)
    self.opciones = [printCarta(opcion) for opcion in self.opciones]
    keyboard(player, "Elegí una carta", self.opciones) 

  def pedirTarget(self, player):
    posibles = [p for p in self.livingUsers if p not in self.protectedUsers]
    if self.jugada[0] != 5:
      posibles.remove(player.id)
    if len(posibles) == 0:
      self.ejecutarTurno(player, self.jugada[0], None, None)
    else:
      self.opciones = [self.users[p].first_name for p in posibles]
      keyboard(player, "Elegí un target", self.opciones) 

  def pedirGuess(self, player):
    self.opciones = list(range(2, 9))
    self.opciones = [printCarta(opcion) for opcion in self.opciones]
    keyboard(player, "¿Por qué carta preguntás?", self.opciones) 

  def ejecutarTurno(self, player, card, target, guess):
    msgJugada = player.first_name + " juega un " + printCarta(card)

    if target != None: msgJugada += " contra " + target.first_name

    #if (guess != None): msgJugada += " preguntando por un " + str(guess)

    bot.send_message(self.grupo, msgJugada)


    if target != None: cartaObj = self.manos[target.id]
    cartaYo = self.manos[player.id]
    if (card == 1 and target != None):
      if (cartaObj != guess):
          bot.send_message(self.grupo, target.first_name + " no tenía un " + printCarta(guess))
      else:
          bot.send_message(self.grupo, target.first_name + " tenía un " + printCarta(guess) + " y pierde")
          self.popPlayer(target)
    elif (card == 2 and target != None):
          bot.send_message(player.id, target.first_name + " tiene un " + printCarta(cartaObj))
          bot.send_message(target.id, player.first_name + " vio tu carta")
    elif (card == 3 and target != None):
      bot.send_message(player.id, target.first_name + " tiene un " + printCarta(cartaObj))
      bot.send_message(target.id, player.first_name + " tiene un " + printCarta(cartaYo))
      if (cartaObj > cartaYo):
        bot.send_message(self.grupo, player.first_name + " tenía un " + printCarta(cartaYo) + " y pierde")
        self.popPlayer(player)
      elif (cartaYo > cartaObj):
        bot.send_message(self.grupo, target.first_name + " tenía un " + printCarta(cartaObj) + " y pierde")
        self.popPlayer(target)
      else:
        bot.send_message(self.grupo, "...")
    elif (card == 4):
      self.protectedUsers.append(player.id)
    elif (card == 5 and target != None):
      if (cartaObj == 8):
        bot.send_message(self.grupo, target.first_name + " descarta un " + printCarta(cartaObj) + " y pierde")
        self.popPlayer(target)
      else:
        self.manos[target.id] = self.mazo.pop()
        bot.send_message(self.grupo, target.first_name + " descarta un " + printCarta(cartaObj) + " y roba; quedan " + str(max(0, len(self.mazo) - 1)) + " en el mazo")
        bot.send_message(target.id, "Descartaste tu carta y recibiste un " + printCarta(self.manos[target.id]))
    elif (card == 6 and target != None):
      self.manos[player.id] = cartaObj
      bot.send_message(player.id, "Ahora tenés un " + printCarta(cartaObj))

      self.manos[target.id] = cartaYo
      bot.send_message(target.id, "Ahora tenés un " + printCarta(cartaYo))
    self.endTurno()

  def endTurno(self):
    if len(self.livingUsers) == 1:
      print ("Solo queda un usuario")
      self.endRonda(False)
    elif len(self.mazo) <= 1: #la ultima carta del mazo es la que descartamos, puede qeudr en 0 si prince al final
      self.endRonda(True)
      print ("Solo queda una carta")
    else:
      self.turno=(self.turno + 1) % len(self.scores)
      while self.getST().id not in self.livingUsers:
        self.turno =(self.turno + 1) % len(self.scores)
        print (self.getST().id)
      self.initTurno(self.getST())

  def popPlayer(self, player):
    bot.send_message(player.id, "Arafue de la ronda :)")
    self.livingUsers.remove(player.id)

  def phase1(self, ctx, msgtext):
    #consultar qué hay en el mazo. tu mano tmb.
    if (ctx.chat.type != "private"): 
      if ("/join" in msgtext):
        self.encolarUser(ctx.from_user)
      if ("/hurry" in msgtext):
        player = self.getST()
        s = " " + mentionUser(player)
        bot.send_message(self.grupo, "Dale, " + s, parse_mode="Markdown")
      #if ("/meaburri" in msgtext):
      #  self.initphase2()
      if ("/quequeda" in msgtext):
        s = "Entre el mazo y lo que la gente tiene en la mano quedan las siguientes cartas:\n"
        cartas = self.mazo[:]
        for player in self.scores:
          try: cartas += self.manos[player]
          except: cartas.append(self.manos[player])
        bot.send_message(self.grupo, s + " ".join([str(c) for c in sorted(cartas)]))
      return    
    
    if (msgtext not in self.opciones): return

    player = ctx.from_user
    msgtext = printCartaInv(msgtext)

    if (self.getST().id != player.id): return

    self.jugada.append(msgtext)
    if (len(self.jugada) == 1):
      try: msgtext = int(msgtext)
      except: return
      #handlear strs
      self.manos[player.id].remove(msgtext)
      self.manos[player.id] = int(self.manos[player.id][0])

      if (msgtext in [4, 7, 8]):
        self.ejecutarTurno(player, self.jugada[0], None, None)
      else:
        self.pedirTarget(player)
    elif (len(self.jugada) == 2):
      if (self.jugada[0] == 1):
        self.pedirGuess(player)
      else:
        self.ejecutarTurno(player, self.jugada[0], self.getUserFromName(self.jugada[1]), None)

    else:
      try: msgtext = int(msgtext)
      except: return
      #todavía no entendí si anda
      self.ejecutarTurno(player, self.jugada[0], self.getUserFromName(self.jugada[1]), self.jugada[2])

  def getUserFromName(self, name):
    return [user for user in self.users.values() if user.first_name == name][0]

  def endRonda(self, showCards):
    if (showCards):
      msg = "Se acabó el mazo!\n"
      for player in self.scores:
        if player in self.livingUsers:
          msg += self.users[player].first_name + " tenía un " + printCarta(self.manos[player]) + "\n"
      bot.send_message(self.grupo, msg)
    mxCard = max([self.manos[p] for p in self.livingUsers])
    mxPlayers = [p for p in self.livingUsers if self.manos[p] == mxCard]
    if len(mxPlayers) > 1:
      bot.send_message(self.grupo, "Empate")
    else:
      bot.send_message(self.grupo, self.users[mxPlayers[0]].first_name + " gana la ronda!")
      self.scores[mxPlayers[0]] += 1
      self.turno = list(self.scores).index(mxPlayers[0])
      #Debería incrementarse solo
    s = "Scores:\n"
    for (player, score) in sorted(self.scores.items(), key = lambda kv:(kv[1], kv[0]))[::-1]:
      s += self.users[player].first_name + ": " + str(score) + "\n"
    bot.send_message(self.grupo, s)
    time.sleep(2)
    
    if max(self.scores.values()) == 4:
      bot.send_message(self.grupo, "Game over")
      player = sorted(self.scores.items(), key = lambda kv:(kv[1], kv[0]))[::-1][0][0]
      bot.send_message(self.grupo, "Felicitaciones " + self.users[player].first_name + " sos el más capo")
      self.scores = {}
      self.users = {}
      self.phase = 0
    else:
      self.initRonda()
      #terminar juego
            
  def endPhase2(self):
    time.sleep(2)
    
  def removeUser(self, id):
    if id not in self.scores: return
    bot.send_message(self.grupo, "You left this game. Use /join to rejoin. Your score will be lost")  
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
  
bot.set_webhook("https://Lovleter.karamchi.repl.co/{}".format(environ['TOKEN']))

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
    return "es el turno de alguien"