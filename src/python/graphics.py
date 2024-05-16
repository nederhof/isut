import numpy as np
from PIL import Image

from settings import grid_size

def add_background(image):
	image = image.convert('RGBA')
	new_image = Image.new('RGBA', image.size, 'WHITE')
	new_image.paste(image, mask=image)
	return new_image

def image_to_ratio(image):
	width, height = image.size
	return width / height

def image_to_grid(image):
	image = add_background(image)
	resized = image.resize((grid_size, grid_size))
	bilevel = resized.convert('1')
	grid = np.asarray(bilevel)
	return grid

def vector_to_embedding(vector, scaler, red):
	scaled = scaler.transform([vector])[0]
	return red.transform([scaled])[0]

