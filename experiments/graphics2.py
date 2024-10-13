import math
import numpy as np
from PIL import Image, ImageOps
from skimage.util import invert
from skimage.morphology import skeletonize, disk, binary_dilation

import includemain
from graphics import *

def add_margin(image, size):
	return ImageOps.expand(image, border=size, fill='white')

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
	size = image.size[1] // thickness
	image = add_background(image)
	image = add_margin(image, size)
	bilevel = image.convert('1', dither=None)
	grid = np.asarray(bilevel)
	grid = grid_to_skeleton(grid, size)
	if len(grid) > 0:
		image = Image.fromarray(grid)
	return image

def white_image(w, h, binarize):
	if binarize:
		return Image.new(mode='1', size=(w, h), color=255)
	else:
		return Image.new(mode='L', size=(w, h), color=255)

def image_to_center(im, grid_size, binarize):
	w, h = im.size
	if w < h:
		w_resize = math.ceil(grid_size * w / h) 
		h_resize = grid_size
	else:
		w_resize = grid_size
		h_resize = math.ceil(grid_size * h / w)
	resized = im.resize((w_resize, h_resize)) 
	block = white_image(grid_size, grid_size, binarize)
	x = (grid_size - w_resize) // 2
	y = (grid_size - h_resize) // 2
	block.paste(resized, (x, y))
	return block

def image_to_square(im, grid_size):
	return im.resize((grid_size, grid_size))
