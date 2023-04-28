import random

from classification import get_pca, find_best_heldout, glyph_properties
from prepare import token_list

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

def main():
	n = 200
	tokens = token_list()
	selection = random.sample(tokens, n)
	hits = classify_all(selection)
	print('Correct', hits, 'out of', n, 'which is', 100 * hits / n)

if __name__ == '__main__':
	main()
