import os
import pickle
import heapq
import sys
from PIL import Image
import numpy as np

from database import images_root, classify_collection
from imagedistortion import distortion_distance

grid_size = 16
pca_size = 40

def glyph_file(text, page, line, glyph):
	return os.path.join(images_root, str(text), str(page), str(line), str(glyph) + '.png')

def glyph_image(text, page, line, glyph):
	file = glyph_file(text, page, line, glyph)
	return Image.open(file)

def image_to_ratio(image):
	width, height = image.size
	return width / height

def image_to_grid(image):
	image = image.convert("RGBA")
	new_image = Image.new("RGBA", image.size, "WHITE")
	new_image.paste(image, mask=image)
	image = new_image
	resized = image.resize((grid_size, grid_size))
	bilevel = resized.convert('1')
	grid = np.asarray(bilevel)
	return grid

def vector_to_pca(vector, scaler, pca):
	scaled = scaler.transform([vector])[0]
	return pca.transform([scaled])[0]

def glyph_properties(text, page, line, glyph, scaler, pca):
	image = glyph_image(text, page, line, glyph)
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
	if abs(aspect1 - aspect2) / max(aspect1,aspect2) < 0.8:
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

def find_best_heldout(ratio, grid, pca, text, page, line, glyph):
	olds = list(classify_collection.find({}))
	olds = list(filter(lambda o : o['text'] != text or o['page'] != page or 
				o['line'] != line or o['glyph'] != glyph, olds))
	return find_best_in(ratio, grid, pca, olds)

def find_best_in(ratio, grid, pca, olds):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	if True:
		olds_less = filter_predicate(olds, lambda o : o['ratio'], current, lambda c : c['ratio'], ratio_predicate)
		if len(olds_less) > 0:
			olds = olds_less
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, 5)
	olds = filter_distance(olds, lambda o : o['grid'], current, lambda c : c['grid'], distort_distance, 1)
	return olds[0]['sign']

def get_pca():
	scaler_pickle = os.path.join(os.path.dirname(__file__), 'scaler.pickle')
	pca_pickle = os.path.join(os.path.dirname(__file__), 'pca.pickle')
	with open(scaler_pickle, 'rb') as handle:
		scaler = pickle.load(handle)
	with open(pca_pickle, 'rb') as handle:
		pca = pickle.load(handle)
	return scaler, pca

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
