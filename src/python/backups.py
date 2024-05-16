import json
import os
import zipfile

from settings import images_root, backups_root
from database import text_collection

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
