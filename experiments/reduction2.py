import math
import numpy as np
from skimage.filters import sobel
from PIL import Image

import includemain
from settings import grid_size
from reduction import *
from graphics2 import add_background, image_to_square

class VGG:
	def __init__(self):
		from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
		from tensorflow.keras.preprocessing.image import load_img, img_to_array
		from tensorflow.keras.models import Model
		model = VGG16()
		self.model = Model(inputs=model.inputs, outputs=model.layers[-2].output)
		self.preprocess_input = preprocess_input
		self.load_img = load_img
		self.img_to_array = img_to_array

	def transform(self, file):
		img = self.load_img(file, target_size=(224, 224), color_mode='rgba')
		img = add_background(img)
		img = img.convert('RGB')
		img = self.img_to_array(img)
		img = img.reshape((1, img.shape[0], img.shape[1], img.shape[2]))
		img = self.preprocess_input(img)
		feature = self.model.predict(img, verbose=0)
		return feature[0]

class AlexNet:
	def __init__(self):
		from torchvision.models import alexnet
		from torchvision import transforms
		from torch import unsqueeze
		self.model = alexnet(pretrained=True)
		self.model.eval()
		self.trans = transforms.Compose([
			transforms.Resize(256),
			transforms.CenterCrop(224),
			transforms.ToTensor(),
			transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
		])
		self.unsqueeze = unsqueeze

	def transform(self, file):
		img = Image.open(file)
		img = add_background(img)
		img = img.convert('RGB')
		img_t = self.trans(img)
		batch_t = self.unsqueeze(img_t, 0)
		return np.asarray(self.model(batch_t)[0].detach())

class Sobel:
	def __init__(self, grid_size):
		self.grid_size = grid_size

	def transform(self, file):
		img = Image.open(file)
		img = add_background(img)
		img = image_to_square(img, self.grid_size)
		return sobel(np.asarray(img)).flatten()

class Identity:
	def __init__(self):
		None
	
	def fit_transform(self, vectors):
		return vectors

	def transform(self, vectors):
		return vectors

def get_reduction2(method, dimension):
	if method == 'Identity':
		return Identity()
	else:
		return get_reduction(method, dimension)
