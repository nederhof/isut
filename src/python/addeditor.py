import bcrypt
import sys, getopt

from salt import SALT
from database import user_collection

try:
	opts, args = getopt.getopt(sys.argv[1:], 'u:p:n:', ['username=', 'password=', 'name='])
except getopt.GetoptError as err:
	print(err)
	print('python3 addeditor.py -u <username> -p <password> -n "<name>"')
	sys.exit(2)
username, password, name = '', '', ''
for opt, arg in opts:
	if opt in ("-u", "--username"):
		username = arg
	if opt in ("-p", "--password"):
		password = arg
	if opt in ("-n", "--name"):
		name = arg

if (len(username) > 0 and len(name) > 0 and len(password) > 0):
	bpassword = password.encode('utf-8')
	hashed_password = bcrypt.hashpw(bpassword, SALT).decode('utf8')
	user_collection.delete_many({ 'username': username })
	user_collection.insert_one({											 
		'username': username,
		'name': name,
		'hashed': hashed_password,								   
		'role': 'editor',
		'texts': ''
	})
else:
	print('addeditor.py -u <username> -p <password> -n <name>')
