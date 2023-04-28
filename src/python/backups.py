import json
import os
import zipfile

from database import text_collection, images_root, backups_root

if False:
	from pymongo import MongoClient
	from pymongo.errors import ConnectionFailure

	maxServerDelay = 1
	client = MongoClient('mongodb://localhost:27017/',
			serverSelectionTimeoutMS=maxServerDelay)

	try:
		client.server_info()
	except ConnectionFailure as err:
		print(err)
		print('cannot connect, run first: sudo service mongod start')
		exit(1)
	db = client['isut']

	src_dir = os.path.dirname(os.path.dirname(__file__))
	root_dir = os.path.dirname(src_dir)
	images_root = os.path.join(src_dir, 'public', 'texts')
	backups_root = os.path.join(root_dir, 'backups')

for text in text_collection.find({}):
	text.pop('_id', None)
	text.pop('__v', None)
	record = json.dumps(text, ensure_ascii=False, default=str)
	index = text['index']
	name = text['name'].replace(' ', '')
	backup_file = os.path.join(backups_root, name + '.zip')
	if os.path.exists(backup_file):
		print('will not overwrite', backup_file)
		continue
	images_dir = os.path.join(images_root, str(index))
	with zipfile.ZipFile(backup_file, mode='w') as archive:
		archive.writestr('text.json', record)
		for page_dir, _, image_files in os.walk(images_dir):
			for image_file in image_files:
				image_path = os.path.join(page_dir, image_file)
				rel_path = os.path.relpath(image_path, images_dir)
				archive.write(image_path, arcname=rel_path)
