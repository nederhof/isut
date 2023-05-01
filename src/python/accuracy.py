import math
import random
import time

from classification import get_pca, find_best_heldout, glyph_properties
from prepare import token_list, do_pca

def classify(text, page, line, glyph, scaler, pca):
	ratio, grid, pca_val = glyph_properties(text, page, line, glyph, scaler, pca)
	return find_best_heldout(ratio, grid, pca_val, text, page, line, glyph)

def classify_all(tokens):
	scaler, pca = get_pca()
	hits = 0
	for token in tokens:
		predicted = classify(token['text'], token['page'], token['line'], token['glyph'], scaler, pca)
		if predicted == token['sign']:
			hits += 1
	return hits

def limited_pca(tokens):
	add_grids(tokens)
	scaler, pca = train_pca(tokens)
	store_pca(scaler, pca)
	

def main():
	tokens = token_list()
	tokens = [token for token in tokens if len(token['sign']) == 1]
	nTokens = len(tokens)
	nTypes = len({token['sign'] for token in tokens})
	print('Number of types:', nTypes, 'number of tokens:', nTokens)
	random.shuffle(tokens)
	n = math.floor(len(tokens) / 4)
	test = tokens[:n]
	train = tokens[n:]
	do_pca(train)
	# selection = random.sample(tokens, n)
	start = time.time()
	hits = classify_all(test)
	end = time.time()
	time_per_token = (end-start) / n
	print('Correct', hits, 'out of', n, 'which is', 100 * hits / n)
	print('Seconds per token:', time_per_token)

if __name__ == '__main__':
	main()
