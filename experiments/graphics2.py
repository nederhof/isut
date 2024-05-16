import math
import numpy as np
from PIL import Image
from skimage.util import invert
from skimage.morphology import skeletonize, disk, binary_dilation

import includemain
from graphics import *

def grid_to_skeleton(grid, size):
	size = max(1, size)
	grid = invert(grid)
	grid = skeletonize(grid)
	footprint = disk(size)
	grid = binary_dilation(grid, footprint=footprint)
	grid = invert(grid)
	grid = grid[~np.all(grid == True, axis=1), :]
	grid = grid[:, ~np.all(grid == True, axis=0)]
	return grid

def image_to_skeleton(image, thickness):
	image = add_background(image)
	bilevel = image.convert('1', dither=None)
	grid = np.asarray(bilevel)
	grid = grid_to_skeleton(grid, grid.shape[1] / thickness)
	if len(grid) == 0:
		return image
	else:
		return Image.fromarray(grid)

def white_image(w, h):
	if binarize:
		return Image.new(mode='1', size=(w, h), color=255)
	else:
		return Image.new(mode='L', size=(w, h), color=255)

def image_to_center(im, grid_size):
	w, h = im.size
	if w < h:
		w_resize = math.ceil(grid_size * w / h) 
		h_resize = grid_size
	else:
		w_resize = grid_size
		h_resize = math.ceil(grid_size * h / w)
	resized = im.resize((w_resize, h_resize)) 
	block = white_image(grid_size, grid_size)
	x = (grid_size - w_resize) // 2
	y = (grid_size - h_resize) // 2
	block.paste(resized, (x, y))
	return block

def image_to_square(im, grid_size):
	return im.resize((grid_size, grid_size))
