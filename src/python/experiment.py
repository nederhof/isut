from PIL import Image, ImageOps, ImageTk
from io import BytesIO
from tkinter import Tk, Label, Canvas, Button
import random
import time
import json
import os
import sys
import shutil
import numpy as np
from argparse import Namespace
from sklearn.preprocessing import StandardScaler
from skimage.transform import resize
import matplotlib.pyplot as plt

from graphics import image_add_background
from reduction import get_reduction
from classification import token_file, glyph_image, token_image, image_to_skeleton, \
		filter_distance, best_signs, squared_distance
from prepare import token_list

## Constants

RESULTS_DIR = 'results'
DATA_DIR = 'data'
HANDDRAWN_DIR = 'handdrawn'

## For encoding

with open('unipoints.json', 'r') as f:
	name_to_unicode = json.load(f)
unicode_to_name = {chr(u): n for n, u in name_to_unicode.items()}

def map_unicode_to_name(c):
	if c in unicode_to_name:
		return unicode_to_name[c]
	else:
		return c

def map_unicode_to_names(s):
	return ''.join([map_unicode_to_name(c) for c in list(s)])

## Freezing dataset

def freeze_data():
	if not os.path.exists(DATA_DIR):
		os.makedirs(DATA_DIR)
	for file_name in os.listdir(DATA_DIR):
		path = os.path.join(DATA_DIR, file_name)
		os.remove(path)
	tokens = token_list()
	random.shuffle(tokens)
	files = []
	for token in tokens:
		sign = token['sign']
		path_old = token_file(token)
		file_new = str(len(files)) + '.png'
		path_new = os.path.join(DATA_DIR, file_new)
		shutil.copy(path_old, path_new)
		files.append({'sign': sign, 'file': file_new})
	file_index = os.path.join(DATA_DIR, 'index.json')
	with open(file_index, "w") as fp:
		json.dump(files, fp)

## For manual drawing

window = None
label = None
canvas = None
accept = None

def prepare_manual():
	global window, label, canvas, accept
	window = Tk()
	label = Label(window)
	label.pack()
	canvas = Canvas(window, bg='white', width=400, height=400)
	canvas.pack()
	canvas.bind('<B1-Motion>', draw_line)
	canvas.bind('<B3-Motion>', erase_line)
	canvas.bind('<ButtonRelease-1>', release_draw)
	canvas.bind('<ButtonRelease-3>', release_erase)
	accept = Button(window, text='Classify', height=2, bg='green', fg='white', 
		font=('bold', 30), command=classify_manual)
	accept.pack()

def show_glyph(token):
	image = Image.open(token['file'])
	im = ImageTk.PhotoImage(image)
	label.configure(image=im)
	label.image = im
	image.save(RESULTS_DIR + '/original' + str(n_tests_done) + '.png')
	canvas.delete('all')

thickness_draw = 10
thickness_erase = 20
pos_draw = None
pos_erase = None
def draw_line(event):
	global pos_draw, start
	if start is None:
		start = time.time()
	x, y = event.x, event.y
	canvas.create_oval((x-thickness_draw, y-thickness_draw, x+thickness_draw, y+thickness_draw), fill='black')
	if pos_draw:
		canvas.create_line(pos_draw[0], pos_draw[1], x, y, width=2*thickness_draw)
	pos_draw = (x, y)
def erase_line(event):
	global pos_erase
	x, y = event.x, event.y
	canvas.create_oval((x-thickness_erase, y-thickness_erase, x+thickness_erase, y+thickness_erase), 
		fill='white', outline='white')
	if pos_erase:
		canvas.create_line(pos_erase[0], pos_erase[1], x, y, width=2*thickness_erase, fill='white')
	pos_erase = (x, y)
def release_draw(event):
	global pos_draw
	pos_draw = None
def release_erase(event):
	global pos_erase
	pos_erase = None

## Methods and accuracy

# Possible are: 'PCA', 'Isomap', 'UMAP', 'LocallyLinearEmbedding'
# Best accuracy is PCA, then Isomap. The others are very bad.
method = None
grid_size = None
dimension = None
skeletonize = None
skeleton_thickness = None
n_tests = None
n_best = None
filter_ligatures = None
filter_sign = None

hits = None
classifications = None
time_total = None
reductions = None
handdrawn_index = None

def report():
	print('Method', method)
	for i in range(n_best):
		print('correct top', i+1, ':', 
			hits[i], 'out of', n_tests, 'which is', 100 * hits[i] / n_tests)

def evaluate(cl, classes):
	for i in range(n_best):
		if len(classes) >= i+1 and classes[i] == cl:
			for j in range(i, n_best):
				hits[j] += 1
	if len(classes) > 0:
		classifications.append({'truth': map_unicode_to_names(cl), 'machine': map_unicode_to_names(classes[0])})

def image_to_vector(image):
	global handdrawn_index
	if skeletonize:
		im = image_to_skeleton(image, skeleton_thickness)
		if n_tests_done is not None:
			file_original = RESULTS_DIR + '/original' + str(n_tests_done-1) + '.png'
			image.save(file_original)
			file_derived = RESULTS_DIR + '/derived' + str(n_tests_done-1) + '.png'
			plt.imsave(file_derived, im, cmap='Greys_r')
			# derived = Image.fromarray(np.uint8(im)).convert('RGB')
			# derived.save(RESULTS_DIR + '/derived' + str(n_tests_done-1) + '.png')
		im = resize(im, (grid_size, grid_size))
	else:
		im = image_add_background(image)
		resized = im.resize((grid_size, grid_size))
		bilevel = resized.convert('1')
		im = np.asarray(bilevel)
	return im.flatten()

def store_classifications():
	with open(RESULTS_DIR + '/classifications.json', 'w') as f:
		json.dump(classifications, f)

## Training and testing
	
train_tokens = None
train_vectors = None
test_tokens = None
test_token = None
n_tests_done = None
start = None

## Testing

def add_test_features(token):
	add_vector(token)
	token['scaled'] = reductions['scale'].transform([token['vector']])[0]
	token[method] = reductions[method].transform([token['scaled']])[0]

def make_token_and_features(im, sign):
	token = {'sign': sign, 'vector': image_to_vector(im)}
	token['scaled'] = reductions['scale'].transform([token['vector']])[0]
	token[method] = reductions[method].transform([token['scaled']])[0]
	return token

def classify(test_token):
	selector = lambda o : o[method]
	classes = filter_distance(train_tokens, selector, 
				test_token, selector, squared_distance, len(train_tokens))
	return best_signs(classes, n_best)

def classify_and_evaluate(test_token, time_token):
	classes = classify(test_token)
	evaluate(test_token['sign'], classes)
	if time_token:
		classifications[-1]['time'] = round(time_token, 3)

def test_plain():
	global n_tests_done
	n_tests_done = 0
	for token in test_tokens:
		add_test_features(token)
		classify_and_evaluate(token, None)
		n_tests_done += 1

def classify_manual():
	global time_total, n_tests_done
	time_token = None
	if start is not None:
		end = time.time()
		time_token = end-start
		time_total += time_token
	eps = canvas.postscript(colormode='color')
	im = Image.open(BytesIO(bytes(eps,'ascii')))
	inverted = ImageOps.invert(im)
	bbox = inverted.getbbox()
	im = im.crop(bbox)
	file_derived = 'derived' + str(n_tests_done-1) + '.png'
	im.save(RESULTS_DIR + '/' + file_derived)
	token = make_token_and_features(im, test_token['sign'])
	handdrawn_index.append({'sign': token['sign'], 'file': file_derived})
	classify_and_evaluate(token, time_token)
	test_manual()

def test_manual():
	global test_token, n_tests_done, start
	if n_tests_done < len(test_tokens):
		test_token = test_tokens[n_tests_done]
		show_glyph(test_token)
		n_tests_done += 1
		start = None
	else:
		print('Seconds per token:', time_total / n_tests)
		window.destroy()
		
## Training

def add_vector(token):
	image = token_to_image(token)
	token['vector'] = image_to_vector(image)

def add_vectors():
	for token in train_tokens:
		add_vector(token)

def add_scaled():
	global train_vectors, reductions
	vectors = [token['vector'] for token in train_tokens]
	scaler = StandardScaler()
	scaler.fit(vectors)
	train_vectors = []
	for token in train_tokens:
		train_vector = scaler.transform([token['vector']])[0]
		token['scaled'] = train_vector
		train_vectors.append(train_vector)
	reductions['scale'] = scaler

def add_dim_red():
	global reductions
	reduction = get_reduction(method, dimension)
	embeddings = reduction.fit_transform(train_vectors)
	for i in range(len(train_tokens)):
		train_tokens[i][method] = embeddings[i].tolist()
	reductions[method] = reduction

def train():
	add_vectors()
	add_scaled()
	print('Training', method)
	add_dim_red()

## Data

def token_to_image(token):
	return Image.open(token['file'])

def read_tokens(args):
	file_index = os.path.join(args.input_dir, 'index.json')
	with open(file_index, 'r') as fp:
		tokens = json.load(fp)
	for token in tokens:
		token['file'] = os.path.join(args.input_dir, token['file'])
	if filter_sign is not None:
		tokens = [token for token in tokens if map_unicode_to_names(token['sign']) == filter_sign]
	elif filter_ligatures:
		tokens = [token for token in tokens if len(token['sign']) == 1]
	if args.truncate is not None:
		tokens = tokens[-args.truncate:]
	n_tokens = len(tokens)
	n_types = len({token['sign'] for token in tokens})
	print('Number of types: {}; number of tokens: {}'.format(n_types, n_tokens))
	return tokens

def prepare_data(args):
	global train_tokens, test_tokens
	tokens = read_tokens(args)
	train_tokens = tokens[:-n_tests]
	test_tokens = tokens[-n_tests:]
	print('Training size: {}; test size: {}'.format(len(train_tokens), len(test_tokens)))
	train()

## Set up

def prepare_result_dir():
	if not os.path.exists(RESULTS_DIR):
		os.makedirs(RESULTS_DIR)
	for file_name in os.listdir(RESULTS_DIR):
		path = os.path.join(RESULTS_DIR, file_name)
		os.remove(path)

def prepare(args):
	global n_tests_done, hits, classifications, time_total, reductions, handdrawn_index
	prepare_result_dir()
	set_args(args)
	hits = [0 for i in range(n_best)]
	classifications = []
	time_total = 0
	reductions = {}
	handdrawn_index = []
	prepare_data(args)

def finalize():
	report()
	store_classifications()

def write_handdrawn_index():
	file_index = os.path.join(RESULTS_DIR, 'index.json')
	with open(file_index, "w") as fp:
		json.dump(handdrawn_index, fp)

def read_handdrawn(args):
	global test_tokens
	file_index = os.path.join(args.handdrawn_dir, 'index.json')
	with open(file_index, 'r') as fp:
		test_tokens = json.load(fp)
	test_tokens = test_tokens[-args.n_tests:]
	for token in test_tokens:
		token['file'] = os.path.join(args.handdrawn_dir, token['file'])

def run_plain(args):
	prepare(args)
	test_plain()
	finalize()

def run_handdrawn(args):
	prepare(args)
	read_handdrawn(args)
	test_plain()
	finalize()

def run_manual(args):
	global n_tests_done
	prepare(args)
	prepare_manual()
	n_tests_done = 0
	test_manual()
	window.mainloop()
	finalize()
	write_handdrawn_index()

def set_args(args):
	global method, grid_size, dimension, skeletonize, skeleton_thickness, \
			n_tests, n_best, filter_ligatures, filter_sign
	method = args.method
	grid_size = args.grid_size
	dimension = args.dimension
	skeletonize = args.skeletonize
	skeleton_thickness = args.skeleton_thickness
	n_tests = args.n_tests
	n_best = args.n_best
	filter_ligatures = args.filter_ligatures
	filter_sign = args.filter_sign

if __name__ == '__main__':
	exp_num = sys.argv[1]
	args = Namespace(
		method='PCA',
		input_dir=DATA_DIR,
		handdrawn_dir=HANDDRAWN_DIR,
		truncate=None,
		grid_size=32,
		dimension=44,
		skeletonize=False,
		skeleton_thickness=15,
		n_tests=1000,
		n_best=5,
		filter_ligatures=True,
		filter_sign=None)
	if len(sys.argv) >= 4:
		args.grid_size = int(sys.argv[2])
		args.dimension = int(sys.argv[3])
	if len(sys.argv) >= 5:
		args.skeleton_thickness = int(sys.argv[4])
	match exp_num:
		case '0':
			# freeze_data() # should be done only once
			None
		case '1':
			# Measuring accuracy of OCR
			run_plain(args)
		case '1test':
			# Measuring accuracy of OCR (test run)
			args.n_tests = 20
			run_plain(args)
		case '1truncate':
			# Measuring accuracy of OCR, with only 8400 tokens in total
			args.truncate = 8400
			run_plain(args)
		case '2':
			# Measuring accuracy of OCR including ligatures
			args.filter_ligatures = False
			run_plain(args)
		case '2test':
			# Measuring accuracy of OCR including ligatures (test run)
			args.n_tests = 20
			args.filter_ligatures = False
			run_plain(args)
		case '3':
			# Measuring accuracy of OCR with Isomap
			args.method = 'Isomap'
			run_plain(args)
		case '3test':
			# Measuring accuracy of OCR with Isomap (test run)
			args.method = 'Isomap'
			args.n_tests = 20
			run_plain(args)
		case '4':
			# Measuring accuracy of OCR with UMAP
			args.method = 'UMAP'
			run_plain(args)
		case '4test':
			# Measuring accuracy of OCR with UMAP (test run)
			args.method = 'UMAP'
			args.n_tests = 20
			run_plain(args)
		case '5':
			# Measuring accuracy of OCR with LocallyLinearEmbedding
			args.method = 'LocallyLinearEmbedding'
			run_plain(args)
		case '5test':
			# Measuring accuracy of OCR with LocallyLinearEmbedding (test run)
			args.method = 'LocallyLinearEmbedding'
			args.n_tests = 20
			run_plain(args)
		case '6':
			# Measuring accuracy of OCR with skeletonization
			args.skeletonize = True
			run_plain(args)
		case '6test':
			# Measuring accuracy of OCR with skeletonization (test run)
			args.skeletonize = True
			args.n_tests = 20
			run_plain(args)
		case '10':
			# Measuring accuracy of OCR of handdrawn shapes
			args.n_tests = 1000
			run_manual(args)
		case '10test':
			# Measuring accuracy of OCR of handdrawn shapes (test run)
			args.n_tests = 20
			run_manual(args)
		case '11':
			# Measuring accuracy of OCR tested on previously handdrawn shapes
			args.n_tests = 100
			run_handdrawn(args)
		case '11test':
			# Measuring accuracy of OCR tested on previously handdrawn shapes (test run)
			args.n_tests = 2
			run_handdrawn(args)
		case '11wacom':
			# Measuring accuracy of OCR tested on previously handdrawn shapes
			args.truncate = 8400
			args.handdrawn_dir = 'Wacom8400JT'
			run_handdrawn(args)
		case '12':
			# Measuring accuracy of OCR tested on previously handdrawn shapes with skeletonization
			args.skeletonize = True
			args.n_tests = 70
			run_handdrawn(args)
		case '12test':
			# Measuring accuracy of OCR tested on previously handdrawn shapes with skeletonization (test run)
			args.skeletonize = True
			args.n_tests = 2
			run_handdrawn(args)
		case '12wacom':
			# Measuring accuracy of OCR tested on previously handdrawn shapes
			args.skeletonize = True
			skeleton_thickness=20,
			args.truncate = 8400
			args.handdrawn_dir = 'Wacom8400JT'
			run_handdrawn(args)
		case '20':
			# Measuring accuracy of OCR exclusively with handdrawn shapes 
			args.input_dir = args.handdrawn_dir
			args.n_tests = 10
			run_plain(args)
		case '20test':
			# Measuring accuracy of OCR exclusively with (test run)
			args.input_dir = args.handdrawn_dir
			args.n_tests = 1
			run_plain(args)
		case '20wacom':
			# Measuring accuracy of OCR exclusively with handdrawn shapes 
			args.input_dir = 'Wacom8400JT'
			run_plain(args)
		case '30':
			# Just takes takens from the same type with skeletonization 
			# (may not be useful; just saves tokens and their skeletonization)
			args.skeletonize = True
			args.filter_sign = 'A1'
			run_plain(args)
		case '30test':
			# Just takes takens from the same type with skeletonization (test run)
			# (may not be useful; just saves tokens and their skeletonization)
			args.skeletonize = True
			args.n_tests = 10
			args.filter_sign = 'A1'
			run_plain(args)
