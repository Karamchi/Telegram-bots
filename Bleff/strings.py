def mentionUser(user):
  try:
    return "@" + user.username
  except:
    return "[" + user.first_name + "](tg://user?id=" + str(user.id) + ")"
  
def format(s):
  return s[0].upper() + s[1:].lower()
