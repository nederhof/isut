import os

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

username=''
password=''

src_dir = os.path.dirname(os.path.dirname(__file__))
root_dir = os.path.dirname(src_dir)
images_root = os.path.join(src_dir, 'public', 'texts')
backups_root = os.path.join(root_dir, 'backups')

maxServerDelay = 1
if username != '':
	client = MongoClient("mongodb://localhost:27017/",
		username=username,
		password=password,
		serverSelectionTimeoutMS=maxServerDelay)
else:
	client = MongoClient("mongodb://localhost:27017/",
		serverSelectionTimeoutMS=maxServerDelay)
try:
	client.server_info()
except ConnectionFailure as err:
	print(err)
	print("cannot connect, run first: sudo service mongod start")
	exit(1)
db = client['isut']
classify_collection = db['classify']
text_collection = db['text']
user_collection = db['user']
