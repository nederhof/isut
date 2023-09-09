import os
import pickle
import heapq
import sys
from PIL import Image
from skimage import io
from skimage.morphology import skeletonize, disk, binary_dilation
from skimage.transform import resize
from skimage.util import invert

import numpy as np

from database import images_root, classify_collection
from imagedistortion import distortion_distance

grid_size = 16
pca_size = 40

do_skeleton = False

def glyph_file(text, page, line, glyph):
	return os.path.join(images_root, str(text), str(page), str(line), str(glyph) + '.png')

def token_image(token):
	return glyph_image(token['text'], token['page'], token['line'], token['glyph'])

def glyph_image(text, page, line, glyph):
	file = glyph_file(text, page, line, glyph)
	return Image.open(file)

def image_to_ratio(image):
	width, height = image.size
	return width / height

def image_to_grid(image):
	image = image.convert('RGBA')
	new_image = Image.new('RGBA', image.size, 'WHITE')
	new_image.paste(image, mask=image)
	image = new_image
	if do_skeleton:
		bilevel = image.convert('1')
		grid = np.asarray(bilevel)
		grid = make_skeleton(grid)
		grid = resize(grid, (grid_size, grid_size))
	else:
		resized = image.resize((grid_size, grid_size))
		bilevel = resized.convert('1')
		grid = np.asarray(bilevel)
	return grid

def make_skeleton(grid):
	grid = invert(grid)
	grid = skeletonize(grid)
	size = max(1, round(grid.shape[1] / 10))
	footprint = disk(size)
	grid = binary_dilation(grid, footprint=footprint)
	grid = invert(grid)
	grid = grid[~np.all(grid == True, axis=1), :]
	grid = grid[:, ~np.all(grid == True, axis=0)]
	return grid

def whiten_background(image):
	new_image = Image.new('RGBA', image.size, 'WHITE')
	new_image.paste(image, mask=image)
	image = new_image
	bilevel = image.convert('1')
	grid = np.asarray(bilevel)
	return grid

def vector_to_pca(vector, scaler, pca):
	scaled = scaler.transform([vector])[0]
	return pca.transform([scaled])[0]

def glyph_properties(text, page, line, glyph, scaler, pca):
	image = glyph_image(text, page, line, glyph)
	return image_properties(image, scaler, pca)

def image_properties(image, scaler, pca):
	ratio = image_to_ratio(image)
	grid = image_to_grid(image)
	vector = grid.flatten()
	pca_val = vector_to_pca(vector.tolist(), scaler, pca).tolist()
	return ratio, grid, pca_val

def ratio_predicate(aspect1, aspect2):
	if aspect1 < 0.8 and aspect2 < 0.8:
		return True
	if aspect1 > 1.25 and aspect2 > 1.25:
		return True
	if abs(aspect1 - aspect2) / max(aspect1,aspect2) < 0.90:
		return True
	return False

def distort_distance(im1, im2):
	return distortion_distance(im1, im2, grid_size)

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

def filter_predicate(olds, oldSelector, curr, currSelector, predicate):
	return [old for old in olds if predicate(oldSelector(old), currSelector(curr))]

def find_best(ratio, grid, pca):
	olds = list(classify_collection.find({}))
	return find_best_in(ratio, grid, pca, olds)

def find_best_heldout(ratio, grid, pca, text, page, line, glyph, k):
	olds = list(classify_collection.find({}))
	olds = list(filter(lambda o : o['text'] != text or o['page'] != page or 
				o['line'] != line or o['glyph'] != glyph, olds))
	return find_best_ranked(ratio, grid, pca, olds, k)

def find_best_in(ratio, grid, pca, olds):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	if False:
		olds_less = filter_predicate(olds, lambda o : o['ratio'], current, lambda c : c['ratio'], ratio_predicate)
		if len(olds_less) > 0:
			olds = olds_less
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, 1)
	if False:
		olds = filter_distance(olds, lambda o : o['grid'], current, lambda c : c['grid'], distort_distance, 1)
	return olds[0]['sign']

def find_best_ranked(ratio, grid, pca, olds, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = filter_distance(olds, lambda o : o['pca'], current, 
			lambda c : c['pca'], squared_distance, len(olds))
	return best_signs(olds, k)

def find_best_k(ratio, grid, pca, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = list(classify_collection.find({}))
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, len(olds))
	return best_signs(olds, k)

def find_best_k_distribution(ratio, grid, pca, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = list(classify_collection.find({}))
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, len(olds))
	best = best_candidates(olds, k)
	return make_pca_distribution(pca, best)

def best_signs(candidates, k):
	best = []
	i = 0
	while len(best) < k and i < len(candidates):
		sign = candidates[i]['sign']
		if sign not in best:
			best.append(sign)
		i += 1
	return best

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

def get_pca():
	scaler_pickle = os.path.join(os.path.dirname(__file__), 'scaler.pickle')
	pca_pickle = os.path.join(os.path.dirname(__file__), 'pca.pickle')
	with open(scaler_pickle, 'rb') as handle:
		scaler = pickle.load(handle)
	with open(pca_pickle, 'rb') as handle:
		pca = pickle.load(handle)
	return scaler, pca

def classify_image(image, k):
	scaler, pca = get_pca()
	ratio, grid, pca_val = image_properties(image, scaler, pca)
	return find_best_k(ratio, grid, pca_val, k)

def classify_distribution(image, k):
	scaler, pca = get_pca()
	ratio, grid, pca_val = image_properties(image, scaler, pca)
	return find_best_k_distribution(ratio, grid, pca_val, k)

def classify(text, page, line, glyph):
	scaler, pca = get_pca()
	ratio, grid, pca_val = glyph_properties(text, page, line, glyph, scaler, pca)
	return find_best(ratio, grid, pca_val)

def main():
	text = sys.argv[1]
	page = sys.argv[2]
	line = sys.argv[3]
	glyph = sys.argv[4]
	try:
		name = classify(text, page, line, glyph)
	except FileNotFoundError:
		sys.stderr.write('File not found')
	else:
		sys.stdout.write(name)

if __name__ == '__main__':
	if True:
		main()
	else: # for testing
		print(classify(1, 1, 1, 2))
