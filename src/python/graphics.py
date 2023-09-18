from PIL import Image
from skimage.util import invert
from skimage.morphology import skeletonize, disk, binary_dilation
import numpy as np

def image_add_background(image):
	image = image.convert('RGBA')
	new_image = Image.new('RGBA', image.size, 'WHITE')
	new_image.paste(image, mask=image)
	return new_image

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
