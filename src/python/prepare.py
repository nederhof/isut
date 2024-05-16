import os
import pickle
from PIL import Image

from settings import scaler_pickle, pca_pickle, token_file, pca_size
from database import text_collection, classify_collection
from graphics import image_to_ratio, image_to_grid, vector_to_embedding

from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

def token_list():
	tokens = []
	for text in text_collection.find({}):
		text_index = text['index']
		for page in text['pages']:
			page_index = page['index']
			for line in page['lines']:
				line_index = line['index']
				for glyph in line['glyphs']:
					glyph_index = glyph['index']
					sign = glyph['name']
					tokens.append({
						'sign': sign,
						'text': text_index,
						'page': page_index,
						'line': line_index,
						'glyph': glyph_index})
	return tokens

def token_image(token):
	return Image.open(token_file(token))

def add_grids(tokens):
	for token in tokens:
		image = token_image(token)
		token['ratio'] = image_to_ratio(image)
		token['grid'] = image_to_grid(image)
		token['vector'] = token['grid'].flatten()

def train_pca(tokens):
	vectors = [token['vector'] for token in tokens]
	scaler = StandardScaler()
	scaler.fit(vectors)
	scaleds = scaler.transform(vectors)
	pca = PCA(n_components=pca_size)
	pca.fit(scaleds)
	return scaler, pca

def store_pca(scaler, pca):
	with open(scaler_pickle, 'wb') as handle:
		pickle.dump(scaler, handle)
	with open(pca_pickle, 'wb') as handle:
		pickle.dump(pca, handle)

def add_pca(tokens, scaler, pca):
	for token in tokens:
		token['pca'] = vector_to_embedding(token['vector'].tolist(), scaler, pca)

def store_properties(sign, text, page, line, glyph, ratio, grid, pca):
	classify_collection.delete_many({ 'text': text, 'page': page, 'line': line, 'glyph': glyph })
	classify_collection.insert_one({ 'sign': sign, 
			'text': text, 'page': page, 'line': line, 'glyph': glyph,
			'ratio': ratio, 'grid': grid, 'pca': pca })

def store_all(tokens):
	classify_collection.drop()
	for token in tokens:
		store_properties(token['sign'], 
			token['text'], token['page'], token['line'], token['glyph'], 
			token['ratio'], token['grid'].tolist(), token['pca'].tolist())

def do_pca(tokens):
	add_grids(tokens)
	scaler, pca = train_pca(tokens)
	store_pca(scaler, pca)
	add_pca(tokens, scaler, pca)
	store_all(tokens)

def main():
	tokens = token_list()
	do_pca(tokens)

if __name__ == '__main__':
	main()
