from database import text_collection

texts = text_collection.find({})

for text in texts:
	print(text['name'])
	for edit in text['history']:
		print('    ', edit['date'], edit['username'])
