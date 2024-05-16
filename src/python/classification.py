import os
import pickle
import heapq
import sys
from PIL import Image

from settings import scaler_pickle, pca_pickle, glyph_file
from database import classify_collection
from graphics import image_to_ratio, image_to_grid, vector_to_embedding

def get_pca():
	with open(scaler_pickle, 'rb') as handle:
		scaler = pickle.load(handle)
	with open(pca_pickle, 'rb') as handle:
		pca = pickle.load(handle)
	return scaler, pca

def image_properties(image, scaler, pca):
	ratio = image_to_ratio(image)
	grid = image_to_grid(image)
	vector = grid.flatten().tolist()
	pca_val = vector_to_embedding(vector, scaler, pca).tolist()
	return ratio, grid, pca_val

def squared_distance(vals1, vals2):
	return sum([(val1-val2)*(val1-val2) for (val1,val2) in zip(vals1,vals2)])

def filter_distance(olds, oldSelector, curr, currSelector, distance, best_n):
	currVal = currSelector(curr)
	distances = [distance(oldSelector(old), currVal) for old in olds]
	if best_n == 1:
		best = [min(range(len(olds)), key=lambda i : distances[i])]
	else:
		best = heapq.nsmallest(best_n, range(len(olds)), key=lambda i : distances[i])
	return [olds[i] for i in best]

def find_best_in(ratio, grid, pca, olds, n):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	return filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, n)

def find_best(ratio, grid, pca):
	olds = list(classify_collection.find({}))
	return find_best_in(ratio, grid, pca, olds, 1)[0]['sign']

def classify(image):
	scaler, pca = get_pca()
	ratio, grid, pca_val = image_properties(image, scaler, pca)
	return find_best(ratio, grid, pca_val)

def best_candidates(candidates, k):
	best = []
	best_signs = []
	i = 0
	while len(best_signs) < k and i < len(candidates):
		candidate = candidates[i]
		sign = candidate['sign']
		if sign not in best_signs:
			best_signs.append(sign)
			best.append(candidate)
		i += 1
	return best

def make_pca_distribution(pca, candidates):
	unnorm = [{ 'name': c['sign'], 'weight': 1/squared_distance(pca, c['pca']) } for c in candidates]
	w = sum([c['weight'] for c in unnorm])
	return [{ 'name': c['name'], 'portion': round(100 * c['weight'] / w) } for c in unnorm]

def find_best_k_distribution(ratio, grid, pca, k):
	olds = list(classify_collection.find({}))
	olds = find_best_in(ratio, grid, pca, olds, len(olds))
	best = best_candidates(olds, k)
	return make_pca_distribution(pca, best)

def classify_distribution(image, k):
	scaler, pca = get_pca()
	ratio, grid, pca_val = image_properties(image, scaler, pca)
	return find_best_k_distribution(ratio, grid, pca_val, k)

def main():
	text = sys.argv[1]
	page = sys.argv[2]
	line = sys.argv[3]
	glyph = sys.argv[4]
	file = glyph_file(text, page, line, glyph)
	try:
		image = Image.open(file)
	except FileNotFoundError:
		sys.stderr.write('File not found')
	else:
		name = classify(image)
		sys.stdout.write(name)

if __name__ == '__main__':
	main()
