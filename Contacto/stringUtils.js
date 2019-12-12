exports.toAscii = function(str) {
        return str.toLowerCase()
        .replace(/á/, 'a')
        .replace(/é/, 'e')
        .replace(/í/, 'i')
        .replace(/ó/, 'o')
        .replace(/ú/, 'u')
        .replace(/ü/, 'u')
        .replace(/¿/, '?')
        .replace(/\./, '')
}

exports.isAlpha = ch => {
	return ch.match(/^[a-zñáéíóúü]+$/i) !== null;
}

var allEquals = (ch, st, ln) => {
  var x = ch.charAt(st)
  for (var i = st + 1; i < st + ln; i++) {
    if (ch.charAt(i) != x)
      return false
  }
  return true
}

exports.hasXinARow = (ch, x) => {
  for (var i = 0; i <= ch.length - x; i++) {
      if (allEquals(ch, i, x)) {
        return true
      }
  }
  return false
}

exports.mentionUser = user => {
  if (user.username)
      return "@" + user.username
  return "[" + user.first_name + "](tg://user?id=" + user.id + ")"
}