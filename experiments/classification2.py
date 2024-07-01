import includemain
from classification import *

from settings import glyph_file, grid_size, pca_size
from database import classify_collection
from graphics2 import add_background, image_to_ratio, vector_to_embedding
from imagedistortion import distortion_distance

# unused
def ratio_predicate(aspect1, aspect2):
	if aspect1 < 0.8 and aspect2 < 0.8:
		return True
	if aspect1 > 1.25 and aspect2 > 1.25:
		return True
	if abs(aspect1 - aspect2) / max(aspect1,aspect2) < 0.90:
		return True
	return False

def filter_predicate(olds, oldSelector, curr, currSelector, predicate):
	return [old for old in olds if predicate(oldSelector(old), currSelector(curr))]

# unused
def find_best_heldout(ratio, grid, pca, text, page, line, glyph, k):
	olds = list(classify_collection.find({}))
	olds = list(filter(lambda o : o['text'] != text or o['page'] != page or 
				o['line'] != line or o['glyph'] != glyph, olds))
	return find_best_ranked(ratio, grid, pca, olds, k)

# unused
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

# unused
def find_best_ranked(ratio, grid, pca, olds, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = filter_distance(olds, lambda o : o['pca'], current, 
			lambda c : c['pca'], squared_distance, len(olds))
	return best_signs(olds, k)

# unused
def find_best_k(ratio, grid, pca, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = list(classify_collection.find({}))
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, len(olds))
	return best_signs(olds, k)

# unused
def find_best_k_distribution(ratio, grid, pca, k):
	current = { 'ratio': ratio, 'grid': grid, 'pca': pca }
	olds = list(classify_collection.find({}))
	olds = filter_distance(olds, lambda o : o['pca'], current, lambda c : c['pca'], squared_distance, len(olds))
	best = best_candidates(olds, k)
	return make_pca_distribution(pca, best)

def best_signs(candidates, k):
	best_signs = []
	best_candidates = []
	i = 0
	while len(best_signs) < k and i < len(candidates):
		sign = candidates[i]['sign']
		if sign not in best_signs:
			best_signs.append(sign)
			best_candidates.append(candidates[i])
		i += 1
	return best_signs, best_candidates
