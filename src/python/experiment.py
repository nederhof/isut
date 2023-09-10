from PIL import Image, ImageOps, ImageTk
from io import BytesIO
from tkinter import Tk, Label, Canvas, Button
import random
import time
import json
from sklearn.preprocessing import StandardScaler

from reduction import get_reduction
from classification import glyph_image, token_image, image_to_grid, image_to_skeleton, \
		filter_distance, best_signs, squared_distance
from prepare import token_list

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

def show_glyph(text, page, line, glyph):
	image = glyph_image(text, page, line, glyph)
	im = ImageTk.PhotoImage(image)
	label.configure(image=im)
	label.image = im
	canvas.delete('all')

thickness_draw = 10
thickness_erase = 20
pos_draw = None
pos_erase = None
def draw_line(event):
	global pos_draw
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

# Best accuracy is PCA, then Isomap. The others are very bad.
# methods = ['PCA', 'UMAP', 'Isomap', 'LocallyLinearEmbedding']
methods = ['PCA']
dimension = 40
reductions = {}
skeletonize = None

n_best = 5
hits = {}
for method in methods:
	hits[method] = [0 for i in range(n_best)]
classifications = None
time_total = 0

def report_methods():
	for method in methods:
		print('Method', method)
		for i in range(n_best):
			print('correct top', i+1, ':', 
				hits[method][i], 'out of', n_test, 'which is', 100 * hits[method][i] / n_test)

def evaluate(method, cl, classes):
	for i in range(n_best):
		if len(classes) >= i+1 and classes[i] == cl:
			for j in range(i, n_best):
				hits[method][j] += 1
	if len(classes) > 0:
		classifications.append({'gold': cl, 'machine': classes[0]})

def image_to_vector(image):
	if skeletonize:
		return image_to_skeleton(image).flatten()
	else:
		return image_to_grid(image).flatten()

def store_classifications():
	with open("classifications.json", "w") as f:
		json.dump(classifications, f)

## Training and testing
	
n_test = None
train_tokens = None
train_vectors = None
test_tokens = None
test_token = None
test_done = None
start = None

def classify(test_token, method):
	selector = lambda o : o[method]
	classes = filter_distance(train_tokens, selector, 
				test_token, selector, squared_distance, len(train_tokens))
	return best_signs(classes, n_best)

def classify_methods(test_token):
	for method in methods:
		classes = classify(test_token, method)
		evaluate(method, test_token['sign'], classes)

def test_plain():
	for token in test_tokens:
		add_token_image(token)
		add_token_features(token)
		classify_methods(token)

def classify_manual():
	global time_total
	end = time.time()
	time_token = (end-start)
	time_total += time_token
	eps = canvas.postscript(colormode='color')
	im = Image.open(BytesIO(bytes(eps,'ascii')))
	inverted = ImageOps.invert(im)
	bbox = inverted.getbbox()
	im = im.crop(bbox)
	token = {'image': im, 'sign': test_token['sign']}
	add_token_features(token)
	classify_methods(token)
	test_manual()

def test_manual():
	global test_token, test_done, start
	if test_done < len(test_tokens):
		test_token = test_tokens[test_done]
		show_glyph(test_token['text'], test_token['page'], test_token['line'], test_token['glyph'])
		test_done += 1
		start = time.time()
	else:
		print('Seconds per token:', time_total / n_test)
		window.destroy()
		
## Testing

def add_token_image(token):
	token['image'] = token_image(token)
	
def add_token_features(token):
	token['vector'] = image_to_vector(token['image'])
	token['scaled'] = reductions['scale'].transform([token['vector']])[0]
	for method in methods:
		token[method] = reductions[method].transform([token['scaled']])[0]

## Training

def add_vectors():
	for token in train_tokens:
		image = token_image(token)
		token['vector'] = image_to_vector(image)

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

def add_dim_red(method):
	global reductions
	reduction = get_reduction(method, dimension)
	embeddings = reduction.fit_transform(train_vectors)
	for i in range(len(train_tokens)):
		train_tokens[i][method] = embeddings[i].tolist()
	reductions[method] = reduction

def train():
	add_vectors()
	add_scaled()
	for method in methods:
		print('Training', method)
		add_dim_red(method)

## Data

def prepare_data():
	global train_tokens, test_tokens
	tokens = token_list()
	tokens = [token for token in tokens if len(token['sign']) == 1]
	n_tokens = len(tokens)
	n_types = len({token['sign'] for token in tokens})
	print('Number of types:', n_types, '; number of tokens:', n_tokens)
	random.shuffle(tokens)
	test_tokens = tokens[:n_test]
	train_tokens = tokens[n_test:]
	train()

if __name__ == '__main__':
	task = 'plain'
	# task = 'manual'
	skeletonize = False
	n_test = 20
	prepare_data()
	test_done = 0
	classifications = []
	if task == 'plain':
		test_plain()
	elif task == 'manual':
		prepare_manual()
		test_manual()
		window.mainloop()
	report_methods()
	store_classifications()
