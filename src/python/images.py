import os
import numpy
from PIL import Image

textsRoot = '../public/texts'

grid_size = 16

def nested_text_file(text, page, line, file):
	return os.path.join(os.path.dirname(__file__),
			textsRoot + '/' + str(text) + '/' + str(page) + '/' + str(line) + '/' + str(file))

def image_to_grid(image):
	image = image.convert('RGBA')
	new_image = Image.new('RGBA', image.size, 'WHITE')
	new_image.paste(image, mask=image)
	image = new_image
	resized = image.resize((grid_size, grid_size))
	bilevel = resized.convert('1')
	grid = numpy.asarray(bilevel)
	return grid

def flatten(xss):
	return [x for xs in xss for x in xs]

def path_to_image_vector(path):
	file = nested_text_file(path[0], path[1], path[2], path[3]) + '.png'
	try:
		image = Image.open(file)
	except FileNotFoundError:
		return None
	return flatten(image_to_grid(image))
