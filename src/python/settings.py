import os

this_dir = os.path.dirname(__file__)
src_dir = os.path.dirname(this_dir)
root_dir = os.path.dirname(src_dir)
images_root = os.path.join(src_dir, 'public', 'texts')
backups_root = os.path.join(root_dir, 'backups')

scaler_pickle = os.path.join(this_dir, 'scaler.pickle')
pca_pickle = os.path.join(this_dir, 'pca.pickle')

def glyph_file(text, page, line, glyph):
	return os.path.join(images_root, str(text), str(page), str(line), str(glyph) + '.png')

def token_file(token):
	return glyph_file(token['text'], token['page'], token['line'], token['glyph'])

def path_file(path):
	return glyph_file(path[0], path[1], path[2], path[3])

grid_size = 25
pca_size = 50
