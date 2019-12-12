var strings = {};

module.exports = strings;

strings.start = 'Welcome!'
strings.hello = "Hola! usá /newgame para empezar un juego nuevo o /help para aprender cómo usarme"

strings.about = [
  "Bot hecho por Espi el Neta",
  "Version 1.0.0 - Junio 2019",
  "Hosteado gratuitamente en glitch.com"
]

strings.help_game = [
  "El objetivo del juego es encontrar una palabra",
  "La palabra la piensa un jugador al que vamos a llamar 'thinker' y dice la primera letra",
  "El resto de los jugadores tienen que decir *definiciones* de palabras que empiecen con esa letra",
  "Cuando uno de los jugadores cree que conoce la palabra que se corresponde con una definición, dice 'contacto'",
  "Ambos cuentan, 1, 2, 3 y dicen (a la vez) la palabra que están pensando",
  "Si dicen la misma palabra, el 'thinker' tiene que dar una letra más de la palabra que había pensado originalmente.",
  "Si el thinker dice la palabra definida en cualquier momento (o sea, antes o después del contacto), quema la palabra, que no se puede volver a usar",
  "El juego termina cuando alguien encuentra la palabra original, que no puede ser quemada. Cuando eso ocurre se puede jugar de vuelta, cambiando el thinker"
]

strings.help_bot = [
  "El bot es una especie de arbitro que permite jugar a este juego a distancia en un grupo de tg",
  "En vez de tener las palabras en la cabeza, los jugadores se las dicen por privado al bot, y él se encarga de reenviar lo que sea necesario al grupo",
  "Para mandar una definición, se manda primero la palabra, después la definición",
  "El comando /newgame inicia el juego",
  "El comando /contacto equivale a decir CONTACTO",
  "Sólo se puede tener una definición pendiente por vez, que es la última que se mandó",
  "Sólo el que manda /contacto debe adivinar la palabra definida, lo que diga el resto de los participantes es ignorado.",
  "Durante un contacto, no se pueden mandar definiciones",
  "Si se agrega una nueva letra, se invalidan todas las palabras a medio definir",
  "El bot tiene un timer que termina el juego con victoria del thinker si pasan 15 minutos",
  "Normalmente, decir dos palabras de la misma familia es como decir la misma palabra. Esto es dificil de implementar en el bot, que por el momento sólo es plural-insensitive.",
  "El bot soporta hasta un juego _activo_ por usuario. Si el mismo usuario está en más de un grupo que está jugando a la vez, no puede mandar mensajes privados al bot, ya que no está implementado cómo saber a qué juego reenviarlos."
]

strings.help = [
  "Aprender a jugar al contacto es como pelar una naranja",
  "/about: Más información",
  "/help\\_game: Cómo jugar al contacto",
  "/help\\_bot: Cómo usar el bot para jugar al contacto"
]

strings.error_groups = "Hay más de un grupo activo para tu usuario"

strings.phase0 = "Se inició un nuevo juego. Mandame una palabra por [privado](tg://user?id=504979973)"

strings.phase1_prefixes = "Sin prefijos porfa"
strings.phase1_reply = "Palabra guardada, el resto va a tratar de adivinarla"
strings.phase1_forward = (s, word) => s + " pensó una palabra con " + cap1(word.slice(0, 1))

strings.error_not_alpha = "Debe ser una sola palabra sin símbolos"

strings.phase2_ff = word => "El thinker terminó el juego. La palabra era *" + word + "*"
strings.phase2_private_ok = "Bien, ahora mandame la definición, o /cancel para mandar una palabra diferente"
strings.phase2_private_error_same_word = "La palabra no puede ser igual a la definición"
strings.phase2_private_error_contacto_corriendo = "Hay un contacto corriendo, si falla mandá de vuelta la definición"
strings.phase2_private_error_burnt = "La palabra ya fue quemada"
strings.phase2_public_burnt = "Quemada"
strings.phase2_public_win = "Sí, era esa"
strings.phase2_public_win_2 = "Bueno, era esa"
strings.phase2_public_contacto_tardo = "Tardaste mucho"
strings.phase2_public_timeout = (thinker, word) => "Se acabó el tiempo! El [thinker](tg://user?id=" + thinker + ") ganó. La palabra era *" + cap1(word) + "*"

strings.phase2_private_error_match_progress = (word, progress) => "Tu palabra debe matchear el progreso actual ("+ cap1(word.slice(0, progress + 1)) + ")"

var cap1 = (string) =>
  string.toUpperCase()
  //return string.charAt(0).toUpperCase() + string.slice(1)
