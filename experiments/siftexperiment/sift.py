import json
import os
import cv2
from sklearn.mixture import GaussianMixture

from simplemath import cosine, TrainedGaussianMixture
from fisher import fisher_vector

input_dir = '../data'

feature_extraction = None
matcher = None

train_tokens = None
test_tokens = None

model = None

def create_feature_extraction():
	global feature_extraction
	nfeatures = 30 # default 0
	nOctaveLayers = 5 # default 3
	contrastThreshold = 0.04 # default 0.04
	edgeThreshold = 30 # default 10
	sigma = 4.6 # default 1.6
	feature_extraction = cv2.SIFT_create(\
				nfeatures=nfeatures,
				nOctaveLayers=nOctaveLayers,
				contrastThreshold=contrastThreshold,
				edgeThreshold=edgeThreshold,
				sigma=sigma)

def create_matcher():
	global matcher
	FLANN_INDEX_KDTREE = 1
	indexParams = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
	searchParams = dict(checks=50)
	matcher = cv2.FlannBasedMatcher(indexParams, searchParams)

def load_white_background(filename):
	image = cv2.imread(filename, cv2.IMREAD_UNCHANGED) 
	trans_mask = image[:,:,3] == 0
	image[trans_mask] = [255, 255, 255, 255]
	return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def image_to_descriptors(filename):
	im = load_white_background(filename)
	im = cv2.resize(im, (64,64), interpolation=cv2.INTER_LINEAR)
	keypoints, descriptors = feature_extraction.detectAndCompute(im, None)
	if descriptors is None:
		return []
	else:
		return descriptors

def read_tokens():
	file_index = os.path.join(input_dir, 'index.json')
	with open(file_index, 'r') as fp:
		tokens = json.load(fp)
	for token in tokens:
		token['file'] = os.path.join(input_dir, token['file'])
	tokens = [token for token in tokens if len(token['sign']) == 1]
	n_tokens = len(tokens)
	n_types = len({token['sign'] for token in tokens})
	print('Number of types: {}; number of tokens: {}'.format(n_types, n_tokens))
	return tokens

def add_descriptors(tokens):
	for token in tokens:
		token['descriptors'] = image_to_descriptors(token['file'])

def make_model():
	global model
	nClusters = 30
	descriptors = [descriptor for token in train_tokens for descriptor in token['descriptors']]
	model = GaussianMixture(nClusters, random_state=0, covariance_type='diag')
	model.fit(descriptors)
	model = TrainedGaussianMixture(model)
	for token in train_tokens:
		if len(token['descriptors']) > 0:
			token['fisher'] = fisher_vector(token['descriptors'], model)
		else:
			token['fisher'] = []
	for token in test_tokens:
		if len(token['descriptors']) > 0:
			token['fisher'] = fisher_vector(token['descriptors'], model)
		else:
			token['fisher'] = []

def classify_descriptors(test_token):
	best_ratio = -1
	best_token = None
	goodnessFactor = 0.6
	for train_token in train_tokens:
		if train_token['descriptors'] is None or len(train_token['descriptors']) == 1:
			continue
		matches = matcher.knnMatch(test_token['descriptors'], train_token['descriptors'], k=2)
		nGoodPoints = len([m for m, n in matches if m.distance < goodnessFactor * n.distance])
		nPoints = max(len(test_token['descriptors']), len(train_token['descriptors']))
		ratio = nGoodPoints / nPoints
		if ratio > best_ratio:
			best_ratio = ratio
			best_token = train_token
	return best_token, best_ratio

def classify_fisher(test_token):
	best_token = None
	best_dist = 1
	fv_test = test_token['fisher']
	if len(fv_test) > 0:
		for train_token in train_tokens:
			fv_train = train_token['fisher']
			if len(fv_train) > 0:
				dist = cosine(fv_test, fv_train)
				if dist < best_dist:
					best_dist = dist
					best_token = train_token
	return best_token, best_dist

def evaluate():
	n = 0
	m = 0
	hits = 0
	for test_token in test_tokens:
		if test_token['descriptors'] is None:
			print(test_token['file'])
			m += 1
			continue
		n += 1
		# best_token, best_ratio = classify_descriptors(test_token)
		best_token, best_ratio = classify_fisher(test_token)
		if best_token is not None and best_token['sign'] == test_token['sign']:
			hits += 1
	print("total:", n+m, "classified:", n, "hits:", hits, "accuracy:", 100 * hits / n)

def prepare_data(n_tests):
	global train_tokens, test_tokens
	create_feature_extraction()
	create_matcher()
	tokens = read_tokens()
	add_descriptors(tokens)
	train_tokens = tokens[:-n_tests]
	test_tokens = tokens[-n_tests:]
	make_model()
	print('Training size: {}; test size: {}'.format(len(train_tokens), len(test_tokens)))

if __name__ == '__main__':
	n_tests = 200
	prepare_data(n_tests)
	evaluate()
