import math
import os
from PIL import Image
import numpy as np
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

from graphics import image_add_background
from reduction import get_reduction

grid_size = 16

dimension = 2

result_dir = 'results'

def get_images(pref):
	vecs = []
	for file_name in sorted(os.listdir(result_dir)):
		if file_name.startswith(pref):
			path = os.path.join(result_dir, file_name)
			im = Image.open(path)
			im = image_add_background(im)
			resized = im.resize((grid_size, grid_size))
			bilevel = resized.convert('1')
			vec = np.asarray(bilevel).flatten()
			vecs.append(vec)
	return vecs

def train_dim_red():
	vecs_orig = get_images('original')
	vecs_deriv = get_images('derived')
	vecs = vecs_orig + vecs_deriv
	scaler = StandardScaler()
	# scaler.fit(vecs)
	scaler.fit(vecs_orig)
	scaled_orig = scaler.transform(vecs_orig)
	scaled_deriv = scaler.transform(vecs_deriv)
	scaled = scaled_orig + scaled_deriv
	model = get_reduction('PCA', dimension)
	# model.fit(scaled)
	model.fit(scaled_orig)
	embed_orig = model.transform(scaled_orig)
	embed_deriv = model.transform(scaled_deriv)
	return (embed_orig, embed_deriv)

def show(embed_orig, embed_deriv):
	color_list = \
		['red','green','blue','yellow','pink','black','orange','purple','beige','brown','gray','cyan','magenta']
	color_repeats = math.ceil(len(embed_orig) / len(color_list))
	colors = np.array((color_repeats * color_list)[:len(embed_orig)])
	plt.scatter(embed_orig[:, 0], embed_orig[:, 1], c=colors)
	plt.scatter(embed_deriv[:, 0], embed_deriv[:, 1], c=colors)
	plt.show()

if __name__ == '__main__':
	(embed_orig, embed_deriv) = train_dim_red()
	show(embed_orig, embed_deriv)

