import numpy
import sys
import json
import uuid
from PIL import Image
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, MDS, Isomap, SpectralEmbedding, LocallyLinearEmbedding
from warnings import simplefilter

from settings import path_file
from graphics import add_background

grid_size = 30

simplefilter(action='ignore', category=FutureWarning)

def get_reduction(method, dimension):
	if method == 'PCA':
		return PCA(n_components=dimension)
	elif method == 't-SNE':
		return TSNE(n_components=dimension, init='pca', perplexity=40, n_iter=300)
	elif method == 'MDS':
		return MDS(n_components=dimension)
	elif method == 'Isomap':
		return Isomap(n_components=dimension)
	elif method == 'SpectralEmbedding':
		return SpectralEmbedding(n_components=dimension)
	elif method == 'LocallyLinearEmbedding':
		return LocallyLinearEmbedding(n_components=dimension)
	elif method == 'UMAP':
		from umap import UMAP
		return UMAP(n_components=dimension, init='random', random_state=0)
	else:
		raise Exception('Unknown method ' + method)

def image_to_vector(image):
	image = add_background(image)
	resized = image.resize((grid_size, grid_size))
	bilevel = resized.convert('1')
	grid = numpy.asarray(bilevel)
	return [x for xs in grid for x in xs]

def path_to_image_vector(path):
	try:
		image = Image.open(path_file(path))
	except FileNotFoundError:
		return None
	else:
		return image_to_vector(image)

def get_embeddings(tokens, red):
	vecs = []
	tokens_ext = []
	for token in tokens:
		vec = path_to_image_vector(token['path'])
		if vec:
			vecs.append(vec)
			tokens_ext.append(token)
	embeds = red.fit_transform(vecs)
	for i in range(len(vecs)):
		tokens_ext[i]['embedding'] = embeds[i].tolist()
	return tokens_ext

def normalize_embeddings(embeddings, dimension):
	margin = 0.25
	if len(embeddings) == 0:
		return embeddings
	scales = []
	mids = []
	for i in range(dimension):
		ems = [em['embedding'][i] for em in embeddings]
		high = max(ems)
		low = min(ems)
		diff = high-low
		mid = low + diff / 2
		scale = diff * (1 + margin) / 2
		scales.append(scale if scale > 0 else 1)
		mids.append(mid)
	for em in embeddings:
		vec = em['embedding']
		em['embedding'] = [(vec[i] - mids[i]) / scales[i] for i in range(len(vec))]
	return embeddings

def main():
	method = sys.argv[1]
	dimension = int(sys.argv[2])
	tokensFile = sys.argv[3]
	with open(tokensFile, 'r') as handle:
		tokens = json.load(handle)
	if len(tokens) <= dimension:
		sys.stderr.write('Too few tokens')
		return
	red = get_reduction(method, dimension)
	try:
		embeddings = get_embeddings(tokens, red)
		normalize_embeddings(embeddings, dimension)
		filename = './python/tmp/' + str(uuid.uuid4()) + '.json'
		with open(filename, 'w') as f:
			json.dump(embeddings, f)
	except ValueError as err:
		sys.stderr.write(str(err))
	else:
		sys.stdout.write(filename)

if __name__ == '__main__':
	main()
