from PIL import Image, ImageOps, ImageTk
from io import BytesIO
from tkinter import Tk, Label, Canvas, Button
import random
import time

from classification import classify_image, get_pca, glyph_image
from prepare import token_list, do_pca

window = Tk()

example_image = Image.new('RGBA', (400, 400), 'WHITE')
example_image = ImageTk.PhotoImage(example_image)
label = Label(window, image=example_image)
label.pack()

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

canvas = Canvas(window, bg='white', width=400, height=400)
canvas.pack()
canvas.bind('<B1-Motion>', draw_line)
canvas.bind('<B3-Motion>', erase_line)
canvas.bind('<ButtonRelease-1>', release_draw)
canvas.bind('<ButtonRelease-3>', release_erase)

k = 5
hits = [0 for i in range(k)]
time_total = 0

def classify():
	global hits, time_total
	end = time.time()
	time_token = (end-start)
	time_total += time_token
	eps = canvas.postscript(colormode='color')
	im = Image.open(BytesIO(bytes(eps,'ascii')))
	inverted = ImageOps.invert(im)
	bbox = inverted.getbbox()
	im = im.crop(bbox)
	classes = classify_image(im, k)
	for i in range(k):
		if len(classes) >= i+1 and classes[i] == test_token['sign']:
			for j in range(i, k):
				hits[j] += 1
	classify_all()

accept = Button(window, text='Classify', height=2, bg='green', fg='white', 
	font=('bold', 30), command=classify)
accept.pack()

def set_up_classify(text, page, line, glyph, scaler, pca):
	image = glyph_image(text, page, line, glyph)
	im = ImageTk.PhotoImage(image)
	label.configure(image=im)
	label.image = im
	canvas.delete('all')
	
m = 0
test_tokens = []
test_token = None
start = time.time()

def classify_all():
	global hits, test_tokens, test_token, start
	scaler, pca = get_pca()
	if len(test_tokens) > 0:
		token = test_tokens[0]
		set_up_classify(token['text'], token['page'], token['line'], token['glyph'], scaler, pca)
		test_tokens = test_tokens[1:]
		test_token = token
		start = time.time()
	else:
		for i in range(k):
			print('Correct top', i+1, ':', hits[i], 'out of', m, 'which is', 100 * hits[i] / m)
		print('Seconds per token:', time_total / m)
		window.destroy()

def main():
	global test_tokens, m
	tokens = token_list()
	tokens = [token for token in tokens if len(token['sign']) == 1]
	nTokens = len(tokens)
	nTypes = len({token['sign'] for token in tokens})
	print('Number of types:', nTypes, '; number of tokens:', nTokens)
	random.shuffle(tokens)
	m = 30
	test = tokens[:m]
	train = tokens[m:]
	do_pca(train)
	test_tokens = test
	classify_all()

if __name__ == '__main__':
	main()
	window.mainloop()
