import random
import time
import json
import os
import math
import sys
import shutil
import csv
import numpy as np
from collections import Counter
from getopt import getopt, GetoptError
from PIL import Image, ImageOps, ImageTk
from io import BytesIO
from tkinter import Tk, Label, Canvas, Button
from collections import defaultdict
from heapq import nlargest
from argparse import Namespace
from sklearn.preprocessing import StandardScaler
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from statistics import mean
import matplotlib.pyplot as plt
import torchvision.transforms as transforms

import includemain
from graphics2 import add_background, image_to_skeleton, image_to_center, image_to_square
from reduction2 import get_reduction2, VGG, AlexNet, Sobel, FFT
from classification2 import filter_distance, best_signs, squared_distance
from imagedistortion import distortion_distance
from indexing import Indexing
from idm import IDM
from cnn import CnnDataset, train_glyphnet, train_bgk, train_cnn1, train_cnn2, train_cnn3

## Constants

RESULTS_DIR = 'results'
DATA_DIR = 'data'
HANDDRAWN_DIR = 'handdrawn'
MODEL_DIR = 'models'

## File utilities

def ensure_exists(dir_name):
	if not os.path.exists(dir_name):
		os.makedirs(dir_name)

def ensure_exists_empty(dir_name):
	ensure_exists(dir_name)
	for file_name in os.listdir(dir_name):
		path = os.path.join(dir_name, file_name)
		os.remove(path)

def dump_json(val, dir_name, file_name):
	path = os.path.join(dir_name, file_name)
	with open(path, 'w') as fp:
		json.dump(val, fp)

def load_json(dir_name, file_name):
	path = os.path.join(dir_name, file_name)
	with open(path, 'r') as fp:
		return json.load(fp)

## For encoding

name_to_unicode = load_json('.', 'unipoints.json')
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
	from prepare import token_list
	ensure_exists_empty(DATA_DIR)
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
	dump_json(files, DATA_DIR, 'index.json')

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
	image = token_to_image(token)
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

# Possible methods of dimensionality reduction are: 
# 'PCA', 'Isomap', 'UMAP', 'LocallyLinearEmbedding'
# Best accuracy among these methods is PCA, then Isomap. 
# UMAP and LocallyLinearEmbedding are very bad.
# Further: LDA. Has even lower accuracy than the worst dimensionality reduction methods.
# Further: VGG and VGGwithouttop. Has low accuracy. Very slow.
# Further: AlexNet. Has extremely low accuracy.
# Further: 'Identity'. Is comparable to PCA.
# Further: 'Sobel'. Is a little worse than Identity, and little slower.
# Further: 'FFT'. 
# Further: 'IDM'. Is too slow to be useful and not very accurate.
# Further: 'GlyphNet'. Has highest accuracy overall.
# Further: 'BGK'. Has lower accuracy.
# Further: 'CNN1', 'CNN2', 'CNN3'. Not as good as GlyphNet.
method = None
grid_size = None
dimension = None
skeleton = None
n_vals = None
n_tests = None
n_best = None
filter_ligatures = None
filter_sign = None
filter_common = None
binarize = None
center = None
rerank_grid_size = None
warp = None
context = None

hits = None
classifications = None
precision_counts = None
precision_hits = None
recall_counts = None
recall_hits = None
time_total = None
reductions = None
handdrawn_index = None

def normalize_image(im):
	if binarize:
		return im.convert('1', dither=None)
	else:
		return im.convert('L')

def report():
	print('Method', method)
	for i in range(n_best):
		print('correct top {}: {} out of {}, which is {:0.1f} %'.format(\
				i+1, hits[i], len(test_tokens), 100 * hits[i] / len(test_tokens)))
	prec = mean([precision_hits[c] / precision_counts[c] for c in precision_counts])
	rec = mean([recall_hits[c] / recall_counts[c] for c in recall_counts])
	f = 2 * prec * rec / (prec + rec)
	print('precision: {:0.1f} %; recall: {:0.1f} %; F: {:0.1f} %'.format(\
				prec * 100, rec * 100, f * 100))
	dump_json(classifications, RESULTS_DIR, 'classifications.json')

def evaluate(cl, classes):
	for i in range(n_best):
		if len(classes) >= i+1 and classes[i] == cl:
			for j in range(i, n_best):
				hits[j] += 1
	if len(classes) > 0:
		# debug_str(map_unicode_to_names(cl), 56)
		classifications.append({'truth': map_unicode_to_names(cl), 'machine': map_unicode_to_names(classes[0])})
		best_cl = classes[0]
		precision_counts[best_cl] += 1
		recall_counts[cl] += 1
		if cl == best_cl:
			precision_hits[best_cl] += 1
			recall_hits[cl] += 1

def image_to_block(image, size):
	# debug_image(image, 56)
	if skeleton is not None:
		im = image_to_skeleton(image, skeleton)
		if False and n_tests_done is not None:
			file_original = RESULTS_DIR + '/original' + str(n_tests_done) + '.png'
			image.save(file_original)
			file_derived = RESULTS_DIR + '/derived' + str(n_tests_done) + '.png'
			plt.imsave(file_derived, im, cmap='Greys_r')
			# derived = Image.fromarray(np.uint8(im)).convert('RGB')
			# derived.save(RESULTS_DIR + '/derived' + str(n_tests_done-1) + '.png')
	else:
		im = add_background(image)
	if center:
		im = image_to_center(im, size, False)
	else:
		im = image_to_square(im, size)
	# debug_image(im, 56)
	return im

def image_to_grid(image, size):
	im = image_to_block(image, size)
	im = normalize_image(im)
	return np.asarray(im)

def image_to_vector(image):
	return image_to_grid(image, grid_size).flatten()

def image_to_torch(image):
	im = image_to_block(image, grid_size).convert('L')
	transform = transforms.ToTensor()
	return transform(im)

## Training and testing
	
train_tokens = None
val_tokens = None
test_tokens = None
train_signs = None
test_token = None
n_tests_done = None
start = None
class_to_int = None
classes = None

def debug_str(s, debug_num):
	# if n_tests_done == debug_num:
	# print(n_tests_done, s)
	None

def debug_image(im, debug_num):
	# if n_tests_done == debug_num:
		# im.save('debug/test' + str(n_tests_done) + '.png')
	None

## Testing

def add_test_features(token):
	add_vector(token)
	add_scaled(token)
	# debug_str(token['scaled'], 56)
	if method == 'LDA':
		add_lda(token)
	elif method == 'VGG' or method == 'VGGwithouttop':
		add_vgg(token)
	elif method == 'AlexNet':
		add_alexnet(token)
	elif method == 'Sobel':
		add_sobel(token)
	elif method == 'FFT':
		add_fft(token)
	elif method == 'IDM':
		add_idm(token)
	elif method in ['GlyphNet', 'BGK', 'CNN1', 'CNN2', 'CNN3']:
		add_torch(token)
	else:
		add_method(token, method)

def make_token_and_features(im, sign):
	token = {'sign': sign, 'vector': image_to_vector(im)}
	add_scaled(token)
	if method == 'LDA':
		add_lda(token)
	if method == 'IDM':
		add_idm(token)
	else:
		add_method(token, method)
	return token

def distort_distance(im1, im2):
	return distortion_distance(im1, im2, rerank_grid_size, warp=warp, context=context, bilevel=binarize)

def classify(test_token):
	candidates = reductions['Index'].query(test_token[method], k=len(train_tokens) // 10)
	return best_signs(candidates, n_best)

# TMP
if False:
	tmp_count=0
	tmp_unknown=0
	tmp_wrong=0
	with open("results-glyphnet/classifications.json", 'r') as fp:
		other_classification = json.load(fp)
		fails = {i: pair['machine'] for (i, pair) in enumerate(other_classification) if pair['truth'] != pair['machine']}
		errors = [(pair['truth'],pair['machine']) for pair in other_classification if pair['truth'] != pair['machine']]
		error_counter = Counter(errors)
		counter_counter = Counter(error_counter.values())
		print(error_counter)
		print(counter_counter)

def classify_and_evaluate(test_token, time_token):
	global tmp_count, tmp_unknown, tmp_wrong
	if method == 'LDA':
		evaluate(test_token['sign'], test_token[method])
	elif method in ['GlyphNet', 'BGK', 'CNN1', 'CNN2', 'CNN3']:
		signs = reductions[method].query(test_token['torch'])[:n_best]
		evaluate(test_token['sign'], signs)
	else:
		signs, candidates = classify(test_token)
		# TMP start test
		if False and tmp_count in fails:
			if test_token['sign'] in train_signs:
				test_sign = map_unicode_to_names(test_token['sign'])
				wrong_sign = fails[tmp_count]
				labels = [map_unicode_to_names(t['sign']) for t in candidates]
				test_image = token_to_image(test_token)
				test_name = str(tmp_count) + '-te-' + test_sign + '.png'
				test_image.save(RESULTS_DIR + '/' + test_name)
				print("SYNC", tmp_wrong+1, tmp_count)
				try:
					wrong_index = labels.index(wrong_sign)
					wrong_token = candidates[wrong_index]
					wrong_image = token_to_image(wrong_token)
					wrong_name = str(tmp_count) + '-tr-' + wrong_sign + '.png'
					wrong_image.save(RESULTS_DIR + '/' + wrong_name)
				except ValueError:
					print("WRONG type", tmp_wrong+1, wrong_sign)
				try:
					other_index = labels.index(test_sign)
					other_token = candidates[other_index]
					other_image = token_to_image(other_token)
					other_name = str(tmp_count) + '-tz-' + test_sign + '.png'
					other_image.save(RESULTS_DIR + '/' + other_name)
				except ValueError:
					None
			else:
				tmp_unknown += 1
			tmp_wrong += 1
		# tmp_count += 1
		# TMP stop test
		if rerank_grid_size is not None:
			add_rerank_grid(test_token)
			for c in candidates:
				add_rerank_grid(c)
			selector = lambda o : o['grid']
			reranked = filter_distance(candidates, selector,
				test_token, selector, distort_distance, len(candidates))
			signs = [r['sign'] for r in reranked]
		evaluate(test_token['sign'], signs)
	if time_token:
		classifications[-1]['time'] = round(time_token, 3)

def test_plain():
	global n_tests_done
	n_tests_done = 0
	start = time.time()
	for token in test_tokens:
		add_test_features(token)
		classify_and_evaluate(token, None)
		n_tests_done += 1
	end = time.time()
	print('Classification took {0:0.1f} sec'.format(end-start))
	# TMP
	# print(tmp_unknown, tmp_wrong)

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

def add_rerank_grid(token):
	image = token_to_image(token)
	token['grid'] = image_to_grid(image, rerank_grid_size)

def add_vector(token):
	image = token_to_image(token)
	token['vector'] = image_to_vector(image)

def add_vectors():
	for token in train_tokens:
		add_vector(token)

def add_scaled(token):
	token['scaled'] = reductions['scale'].transform([token['vector']])[0]

def add_scaleds():
	global reductions
	vectors = [token['vector'] for token in train_tokens]
	scaler = StandardScaler()
	scaler.fit(vectors)
	reductions['scale'] = scaler
	for token in train_tokens:
		add_scaled(token)

def add_torch(token):
	image = token_to_image(token)
	token['torch'] = image_to_torch(image)

def add_torchs():
	for token in train_tokens:
		add_torch(token)
	for token in val_tokens:
		add_torch(token)

def add_method(token, method):
	token[method] = reductions[method].transform([token['scaled']])[0]

def add_dim_red():
	global reductions
	reduction = get_reduction2(method, dimension)
	reductions[method] = reduction
	reductions['Index'] = Indexing()
	start = time.time()
	embeddings = reduction.fit_transform([token['scaled'] for token in train_tokens])
	end = time.time()
	print('Training took {0:0.1f} sec'.format(end-start))
	for i in range(len(train_tokens)):
		token = train_tokens[i]
		token[method] = embeddings[i].tolist()
		reductions['Index'].add(token[method], token)
	reductions['Index'].finalize()

def make_class_index():
	global class_to_int, classes
	class_to_int = {}
	classes = []
	for token in train_tokens:
		ch = token['sign']
		if ch not in class_to_int:
			class_to_int[ch] = len(class_to_int) + 1
			classes.append(ch)

def add_lda(token):
	scores = reductions['LDA'].predict_log_proba([token['scaled']])[0]
	indexes = nlargest(n_best, range(scores.size), key=lambda i: scores[i])
	token['LDA'] = [classes[index] for index in indexes]

def add_ldas():
	global reductions
	reduction = LinearDiscriminantAnalysis()
	class_indexes = [class_to_int[token['sign']] for token in train_tokens]
	start = time.time()
	reduction.fit([token['scaled'] for token in train_tokens], class_indexes)
	end = time.time()
	print('Training took {0:0.1f} sec'.format(end-start))
	reductions[method] = reduction

def add_vgg(token):
	token[method] = reductions['VGG'].transform(token['file'])

def add_vggs():
	global reductions
	withouttop = (method == 'VGGwithouttop')
	start = time.time()
	reductions['VGG'] = VGG(withouttop=withouttop)
	reductions['Index'] = Indexing()
	for token in train_tokens:
		add_vgg(token)
		reductions['Index'].add(token[method], token)
	end = time.time()
	print('Training took {0:0.1f} sec'.format(end-start))
	reductions['Index'].finalize()

def add_alexnet(token):
	token['AlexNet'] = reductions['AlexNet'].transform(token['file'])

def add_alexnets():
	global reductions
	reductions['AlexNet'] = AlexNet()
	reductions['Index'] = Indexing()
	for token in train_tokens:
		add_alexnet(token)
		reductions['Index'].add(token['AlexNet'], token)
	reductions['Index'].finalize()

def add_sobel(token):
	token['Sobel'] = reductions['Sobel'].transform(token['file'])

def add_sobels():
	global reductions
	reductions['Sobel'] = Sobel(grid_size)
	reductions['Index'] = Indexing()
	for token in train_tokens:
		add_sobel(token)
		reductions['Index'].add(token['Sobel'], token)
	reductions['Index'].finalize()

def add_fft(token):
	token['FFT'] = reductions['FFT'].transform(token['file'])

def add_ffts():
	global reductions
	reductions['FFT'] = FFT(grid_size)
	reductions['Index'] = Indexing()
	for token in train_tokens:
		add_fft(token)
		reductions['Index'].add(token['FFT'], token)
	reductions['Index'].finalize()

def add_idm(token):
	image = token_to_image(token)
	token['IDM'] = image_to_grid(image, grid_size)

def add_idms():
	global reductions
	reductions['Index'] = IDM(grid_size, warp, context, binarize)
	for token in train_tokens:
		add_idm(token)
		reductions['Index'].add(token['IDM'], token)

def add_cnn():
	global reductions
	train_set = CnnDataset(train_tokens, class_to_int, classes)
	val_tokens_known = [token for token in val_tokens if token['sign'] in class_to_int]
	val_set = CnnDataset(val_tokens_known, class_to_int, classes)
	ensure_exists(MODEL_DIR)
	start = time.time()
	if method == 'GlyphNet':
		reductions[method] = train_glyphnet(train_set, val_set, grid_size, MODEL_DIR + '/cnnmodel.pth')
	elif method == 'BGK':
		reductions[method] = train_bgk(train_set, val_set, grid_size, MODEL_DIR + '/cnnmodel.pth')
	elif method == 'CNN1':
		reductions[method] = train_cnn1(train_set, val_set, grid_size, MODEL_DIR + '/cnnmodel.pth')
	elif method == 'CNN2':
		reductions[method] = train_cnn2(train_set, val_set, grid_size, MODEL_DIR + '/cnnmodel.pth')
	elif method == 'CNN3':
		reductions[method] = train_cnn3(train_set, val_set, grid_size, MODEL_DIR + '/cnnmodel.pth')
	else:
		print('Unknown CNN method:', method)
	end = time.time()
	print('Training took {0:0.1f} sec'.format(end-start))

def train():
	add_vectors()
	add_scaleds()
	make_class_index()
	print('Training', method)
	if method == 'LDA':
		add_ldas()
	elif method == 'VGG' or method == 'VGGwithouttop':
		add_vggs()
	elif method == 'AlexNet':
		add_alexnets()
	elif method == 'Sobel':
		add_sobels()
	elif method == 'FFT':
		add_ffts()
	elif method == 'IDM':
		add_idms()
	elif method in ['GlyphNet', 'BGK', 'CNN1', 'CNN2', 'CNN3']:
		add_torchs()
		add_cnn()
	else:
		add_dim_red()

## Data

def token_to_image(token):
	return Image.open(token['file'])

def read_tokens(args):
	tokens = load_json(args.input_dir, 'index.json')
	for token in tokens:
		token['file'] = os.path.join(args.input_dir, token['file'])
	if filter_sign is not None:
		tokens = [token for token in tokens if map_unicode_to_names(token['sign']) == filter_sign]
	elif filter_ligatures:
		tokens = [token for token in tokens if len(token['sign']) == 1]
	if args.truncate_start is not None:
		tokens = tokens[-args.truncate_start:]
	if args.truncate_end is not None:
		tokens = tokens[:-args.truncate_end]
	n_tokens = len(tokens)
	n_types = len({token['sign'] for token in tokens})
	print('Number of types: {}; number of tokens: {}'.format(n_types, n_tokens))
	return tokens

def prepare_data(args):
	global train_tokens, train_signs, val_tokens, test_tokens
	tokens = read_tokens(args)
	train_tokens = tokens[:-(n_vals+n_tests)]
	val_tokens = tokens[-(n_vals+n_tests):-n_tests]
	test_tokens = tokens[-n_tests:]
	if args.filter_common is not None:
		counter = Counter([token['sign'] for token in train_tokens])
		frequent_items = sorted(counter.items(), key=lambda item: -item[1])[:args.filter_common]
		frequent_signs = {t for (t,_) in frequent_items}
		train_tokens = [token for token in train_tokens if token['sign'] in frequent_signs]
		val_tokens = [token for token in val_tokens if token['sign'] in frequent_signs]
		test_tokens = [token for token in test_tokens if token['sign'] in frequent_signs]
	train_signs = {token['sign'] for token in train_tokens}
	print('Training size: {}; validation size: {}; test size: {}'.format(\
			len(train_tokens), len(val_tokens), len(test_tokens)))
	train()

def make_train_statistics():
	trainfreq = Counter([map_unicode_to_names(token['sign']) for token in train_tokens])
	dump_json(trainfreq, RESULTS_DIR, 'trainfreq.json')

def count(args):
	set_args(args)
	tokens = load_json(args.input_dir, 'index.json')
	if filter_ligatures:
		tokens = [token for token in tokens if len(token['sign']) == 1]
	n_tokens = len(tokens)
	types_list = [token['sign'] for token in tokens]
	types_set = {sign for sign in types_list}
	n_types = len(types_set)
	print('Number of types: {}; number of tokens: {}'.format(n_types, n_tokens))
	with open('tokenstypes.csv', 'w') as file:
		writer = csv.writer(file)
		writer.writerow(['ntokens', 'ntypes'])
		type_subset = set()
		for i, t in enumerate(types_list):
			type_subset.add(t)
			writer.writerow([str(i+1), str(len(type_subset))])
	type_to_freq = defaultdict(int)
	for t in types_list:
		type_to_freq[t] += 1
	sorted_types = sorted(type_to_freq, key=lambda t: -type_to_freq[t])
	with open('typestokens.csv', 'w') as file:
		writer = csv.writer(file)
		writer.writerow(['ntypes', 'ntokens'])
		for i, t in enumerate(sorted_types):
			writer.writerow([str(i+1), str(type_to_freq[t])])
	with open('typesproportion.csv', 'w') as file:
		writer = csv.writer(file)
		writer.writerow(['ntypes', 'tokens'])
		accum = 0
		for i, t in enumerate(sorted_types):
			accum += type_to_freq[t]
			perc = 100 * accum / n_tokens
			writer.writerow([str(i+1), str(perc)])

## Set up

def prepare(args):
	global hits, classifications, \
		precision_counts, precision_hits, recall_counts, recall_hits, \
		time_total, reductions, handdrawn_index
	set_args(args)
	ensure_exists_empty(RESULTS_DIR)
	hits = [0 for i in range(n_best)]
	classifications = []
	precision_counts = defaultdict(int)
	precision_hits = defaultdict(int)
	recall_counts = defaultdict(int)
	recall_hits = defaultdict(int)
	time_total = 0
	reductions = {}
	handdrawn_index = []
	prepare_data(args)
	make_train_statistics()

def read_handdrawn(args):
	global test_tokens
	test_tokens = load_json(args.handdrawn_dir, 'index.json')
	test_tokens = test_tokens[-args.n_tests:]
	for token in test_tokens:
		token['file'] = os.path.join(args.handdrawn_dir, token['file'])

def run_plain(args):
	prepare(args)
	test_plain()
	report()

def run_handdrawn(args):
	prepare(args)
	read_handdrawn(args)
	test_plain()
	report()

def run_manual(args):
	global n_tests_done
	prepare(args)
	prepare_manual()
	n_tests_done = 0
	test_manual()
	window.mainloop()
	report()
	dump_json(handdrawn_index, RESULTS_DIR, 'index.json')

def set_args(args):
	global method, grid_size, dimension, skeleton, \
			n_vals, n_tests, n_best, filter_ligatures, filter_sign, filter_common, \
			binarize, center, rerank_grid_size, warp, context
	method = args.method
	grid_size = args.grid_size
	dimension = args.dimension
	skeleton = args.skeleton
	n_vals = args.n_vals
	n_tests = args.n_tests
	n_best = args.n_best
	filter_ligatures = args.filter_ligatures
	filter_sign = args.filter_sign
	filter_common = args.filter_common
	binarize = args.binarize
	center = args.center
	rerank_grid_size = args.rerank_grid_size
	warp = args.warp
	context = args.context

arguments = [
	('m', 'method'),
	('i', 'input_dir'),
	('h', 'handdrawn_dir'),
	('u', 'truncate_start'),
	('y', 'truncate_end'),
	('g', 'grid_size'),
	('d', 'dimension'),
	('s', 'skeleton'),
	('v', 'n_vals'),
	('t', 'n_tests'),
	('b', 'n_best'),
	('l', 'filter_ligatures'),
	('f', 'filter_sign'),
	('o', 'filter_common'),
	('z', 'binarize'),
	('c', 'center'),
	('r', 'rerank_grid_size'),
	('w', 'warp'),
	('x', 'context')]
short_args = ''.join([short + ':' for (short, _) in arguments])
long_args = [long + '=' for (_, long) in arguments]

if __name__ == '__main__':
	if len(sys.argv) < 2:
		print('First argument is a number identifying an experiment')
		exit(0)
	exp_name = sys.argv[1]
	args = Namespace(
		method='PCA',
		input_dir=DATA_DIR,
		handdrawn_dir=HANDDRAWN_DIR,
		truncate_start=8400, # Added to compare experiments
		truncate_end=None, # Added to compare experiments
		grid_size=40,
		dimension=50,
		skeleton=None,
		n_vals=700,
		n_tests=1000,
		n_best=5,
		filter_ligatures=True,
		filter_sign=None,
		filter_common=None,
		binarize=False,
		center=False,
		rerank_grid_size=None,
		warp=1,
		context=1)
	print(' '.join(sys.argv[1:]))
	try:
		opts, vals = getopt(sys.argv[2:], short_args, long_args)
	except GetoptError as err:
		print(err)
		sys.exit(1)
	for opt, val in opts:
		for (short, long) in arguments:
			if opt == '-' + short or opt == '--' + long:
				if val == 'True':
					vars(args)[long] = True
				elif val == 'False':
					vars(args)[long] = False
				elif val.isnumeric():
					vars(args)[long] = int(val)
				else:
					vars(args)[long] = val
				break
	match exp_name:
		case 'freeze':
			# freeze_data() # should be done only once
			None
		case 'count':
			# Count types and tokens
			count(args)
		case '1':
			# Measuring accuracy of OCR
			# method = PCA [default], Isomap, UMAP, LocallyLinearEmbedding, 
			# LDA, VGG, VGGwithouttop, AlexNet
			#	Identity, Sobel, FFT, GlyphNet, BGK, CNN1, CNN2, CNN3
			# For Isomap, UMAP, LocallyLinearEmbedding, Identity, Sobel,
			#	best result for: binarize = False
			run_plain(args)
			# Note: VGG is very slow. Do:
			# truncate_start = 1000, n_tests = 100
		case '10':
			# Measuring accuracy of OCR of handdrawn shapes
			args.n_tests = 1000
			run_manual(args)
			# Test run:
			# n_tests = 20
		case '20':
			# Measuring accuracy of OCR tested on previously handdrawn shapes
			# handdrawn_dir = 'Trackpad1000JT', 'Wacom1000MJN',
			#	'iPadPro1000CC', 
			# skeletonize = False [default], True
			run_handdrawn(args)
		case '20wacom':
			# Measuring accuracy of OCR tested on previously handdrawn shapes
			# skeletonize = False [default], True
			# args.truncate_start = 8400 # Unnecessary with default setting
			args.handdrawn_dir = 'Wacom8400JT'
			run_handdrawn(args)
		case '30':
			# Measuring accuracy of OCR exclusively with handdrawn shapes 
			# skeletonize = False [default], True
			args.input_dir = args.handdrawn_dir
			run_plain(args)
		case '30wacom':
			# Measuring accuracy of OCR exclusively with handdrawn shapes 
			# skeletonize = False [default], True
			args.input_dir = 'Wacom8400JT'
			run_plain(args)
		case '40':
			# Just takes takens from the same type with skeletonization 
			# (may not be useful; just saves tokens and their skeletonization)
			args.skeletonize = True
			args.filter_sign = 'A1'
			run_plain(args)
