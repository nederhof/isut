from argparse import Namespace
from collections import Counter
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

args = Namespace(
    device='cpu', # or 'cuda'
    n_epochs=100,
    # n_epochs=0,
    learning_rate=0.001,
    batch_size=64,
    max_worsening=10,
	weighted_loss=False,
	verbose=True
)

class CnnDataset(Dataset):
	def __init__(self, tokens, class_to_int, classes):
		self.tokens = tokens
		self.class_to_int = class_to_int
		self.classes = classes
		self.n_classes = len(class_to_int)
		
		counter = Counter([token['sign'] for token in tokens])
		frequencies = [counter[s] for s in classes]
		self.weights = 1.0 / torch.tensor(frequencies, dtype=torch.float32)

	def __len__(self):
		return len(self.tokens)

	def __getitem__(self, index):
		token = self.tokens[index]
		im = token['torch']
		sign = token['sign']
		sign_index = self.class_to_int.get(token['sign'], self.n_classes+1)-1
		return {'sign': sign_index, 'image': im}

def generate_batches(dataset, args, shuffle=True, drop_last=True):
	dataloader = DataLoader(dataset=dataset, batch_size=args.batch_size, \
		shuffle=shuffle, drop_last=drop_last)
	for data_dict in dataloader:
		out_data_dict = {}
		for sign, im in data_dict.items():
			out_data_dict[sign] = data_dict[sign].to(args.device)
		yield out_data_dict

def dim_conv2d(d, kernel_size=3, stride=1):
	return (d - kernel_size) // stride + 1

def dim_pool2d(d, kernel_size=2, stride=None, padding=0):
	if stride is None:
		stride = kernel_size
	return (d - kernel_size + padding) // stride + 1

def pool_padding(d, kernel, stride):
	gap = (d-kernel) % stride
	if gap == 0:
		return 0
	else:
		return stride - gap

class SeparableConv2d(nn.Module):
	def __init__(self, in_channels, out_channels, kernel_size=3, bias=False):
		super(SeparableConv2d, self).__init__()
		self.conv1 = nn.Conv2d(in_channels, in_channels, kernel_size=kernel_size,
                               groups=in_channels, bias=bias, padding='same')
		self.conv2 = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=bias)

	def forward(self, x):
		return self.conv2(self.conv1(x))

class SignCnn1(nn.Module):
	def __init__(self, num_classes, grid_size, in_channels=1, mid_channels=32, num_features=32,
			conv_kernel=3, dropout=0.1):
		super(SignCnn1, self).__init__()
		self.conv1 = nn.Sequential(
			nn.Conv2d(in_channels=in_channels, out_channels=mid_channels,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU())
		self.conv2 = nn.Sequential(
			nn.Conv2d(in_channels=mid_channels, out_channels=mid_channels,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU())
		self.conv3 = nn.Sequential(
			nn.Conv2d(in_channels=mid_channels, out_channels=mid_channels,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU(),
			nn.Dropout(p=dropout))
		dim = grid_size
		self.num_features = dim * dim * mid_channels
		self.linear = nn.Linear(self.num_features, num_classes)

	def forward(self, image, apply_softmax=False):
		mid1 = self.conv1(image)
		mid2 = self.conv2(mid1)
		grid = self.conv3(mid2)
		features = grid.view(-1, self.num_features)
		prediction = self.linear(features)
		if apply_softmax:
			return F.softmax(prediction, dim=1)
		else:
			return prediction

class SignCnn2(nn.Module):
	def __init__(self, num_classes, grid_size, in_channels=1, mid_channels=16, num_features=32,
			conv_kernel1=7, conv_kernel2=5, pool_kernel=2, dropout=0.1):
		super(SignCnn2, self).__init__()
		self.conv1 = nn.Sequential(
			nn.Conv2d(in_channels=in_channels, out_channels=mid_channels,
				kernel_size=conv_kernel1, padding='same'),
			nn.ReLU())
		self.pool1 = nn.MaxPool2d(pool_kernel)
		self.conv2 = nn.Sequential(
			nn.Conv2d(in_channels=mid_channels, out_channels=mid_channels,
				kernel_size=conv_kernel2, padding='same'),
			nn.ReLU())
		self.pool2 = nn.Sequential(
			nn.MaxPool2d(pool_kernel),
			nn.Dropout(p=dropout))
		dim = grid_size
		dim = dim_pool2d(dim, pool_kernel)
		dim = dim_pool2d(dim, pool_kernel)
		self.num_features = dim * dim * mid_channels
		self.linear = nn.Linear(self.num_features, num_classes)

	def forward(self, image, apply_softmax=False):
		mid1 = self.conv1(image)
		mid2 = self.pool1(mid1)
		mid3 = self.conv2(mid2)
		mid4 = self.pool2(mid3)
		features = mid4.view(-1, self.num_features)
		prediction = self.linear(features)
		if apply_softmax:
			return F.softmax(prediction, dim=1)
		else:
			return prediction

class SignCnn3(nn.Module):
	def __init__(self, num_classes, grid_size, in_channels=1, mid_channels=16, num_features=32,
			conv_kernel1=7, conv_kernel2=7, pool_kernel=2, dropout1=0.15, dropout2=0.15):
		super(SignCnn3, self).__init__()
		self.conv1 = nn.Sequential(
			nn.Conv2d(in_channels=in_channels, out_channels=mid_channels,
				kernel_size=conv_kernel1, padding='same'),
			nn.BatchNorm2d(mid_channels),
			nn.ReLU())
		self.pool1 = nn.MaxPool2d(pool_kernel)
		self.conv2 = nn.Sequential(
			nn.Conv2d(in_channels=mid_channels, out_channels=mid_channels,
				kernel_size=conv_kernel2, padding='same'),
			nn.BatchNorm2d(mid_channels),
			nn.ReLU())
		self.pool2 = nn.MaxPool2d(pool_kernel)
		dim = grid_size
		dim = dim_pool2d(dim, pool_kernel)
		dim = dim_pool2d(dim, pool_kernel)
		self.num_features = dim * dim * mid_channels
		self.linear1 = nn.Sequential(
			nn.Linear(self.num_features, self.num_features),
			nn.Dropout(p=dropout1))
		self.linear2 = nn.Sequential(
			nn.Linear(self.num_features, num_classes),
			nn.Dropout(p=dropout2))

	def forward(self, image, apply_softmax=False):
		mid1 = self.conv1(image)
		mid2 = self.pool1(mid1)
		mid3 = self.conv2(mid2)
		mid4 = self.pool2(mid3)
		features1 = mid4.view(-1, self.num_features)
		features2 = self.linear1(features1)
		prediction = self.linear2(features2)
		if apply_softmax:
			return F.softmax(prediction, dim=1)
		else:
			return prediction

# Following Barucci et al. (IEEE Access 9, 2021)
class GlyphNet(nn.Module):
	def __init__(self, num_classes, grid_size, in_channels=1,
			conv_kernel=3, pool_kernel=3, pool_stride=2,
			channelsA=64, channelsB=128, channelsC=256, channelsD=512,
			dropout=0.15):
		super(GlyphNet, self).__init__()
		dim = grid_size
		pad1 = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad1)
		pad2 = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad2)
		self.inblock = nn.Sequential(
			nn.Conv2d(in_channels=in_channels, out_channels=channelsA,
				kernel_size=conv_kernel, padding='same', bias=False),
			nn.BatchNorm2d(channelsA),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad1),
			nn.ReLU(),
			nn.Conv2d(in_channels=channelsA, out_channels=channelsA,
				kernel_size=conv_kernel, padding='same', bias=False),
			nn.BatchNorm2d(channelsA),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad2),
			nn.ReLU())
		pad = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad)
		self.block1 = nn.Sequential(
			SeparableConv2d(channelsA, channelsB, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsB),
			nn.ReLU(),
			SeparableConv2d(channelsB, channelsB, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsB),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad),
			nn.ReLU())
		pad = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad)
		self.block2 = nn.Sequential(
			SeparableConv2d(channelsB, channelsB, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsB),
			nn.ReLU(),
			SeparableConv2d(channelsB, channelsB, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsB),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad),
			nn.ReLU())
		pad = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad)
		self.block3 = nn.Sequential(
			SeparableConv2d(channelsB, channelsC, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsC),
			nn.ReLU(),
			SeparableConv2d(channelsC, channelsC, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsC),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad),
			nn.ReLU())
		pad = pool_padding(dim, pool_kernel, pool_stride)
		dim = dim_pool2d(dim, kernel_size=pool_kernel, stride=pool_stride, padding=pad)
		self.block4 = nn.Sequential(
			SeparableConv2d(channelsC, channelsC, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsC),
			nn.ReLU(),
			SeparableConv2d(channelsC, channelsC, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsC),
			nn.MaxPool2d(pool_kernel, stride=pool_stride, padding=pad),
			nn.ReLU())
		self.exitblock = nn.Sequential(
			SeparableConv2d(channelsC, channelsD, kernel_size=conv_kernel),
			nn.BatchNorm2d(channelsD),
			nn.ReLU())
		self.topblock = nn.Sequential(
			nn.AvgPool2d(dim),
			nn.Flatten(start_dim=1),
			nn.Dropout(p=dropout),
			nn.Linear(channelsD, num_classes))

	def forward(self, image, apply_softmax=False):
		mid1 = self.inblock(image)
		mid2 = self.block1(mid1)
		mid3 = self.block2(mid2)
		mid4 = self.block3(mid3)
		mid5 = self.block4(mid4)
		mid6 = self.exitblock(mid5)
		prediction = self.topblock(mid6)
		if apply_softmax:
			return F.softmax(prediction, dim=1)
		else:
			return prediction

# Following Bermeitinger & Gülden & Konrad, Handbook of Digital Eygyptology (2021).
class BGK(nn.Module):
	def __init__(self, num_classes, grid_size, in_channels=1, mid_channels1=32, mid_channels2=64,
			num_features=256,
			conv_kernel=3, pool_kernel=2, dropout1=0.25, dropout2=0.5):
		super(BGK, self).__init__()
		self.conv1 = nn.Sequential(
			nn.Conv2d(in_channels=in_channels, out_channels=mid_channels1,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU(),
			nn.Conv2d(in_channels=mid_channels1, out_channels=mid_channels1,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU(),
			nn.MaxPool2d(pool_kernel),
			nn.Dropout(p=dropout1))
		self.conv2 = nn.Sequential(
			nn.Conv2d(in_channels=mid_channels1, out_channels=mid_channels2,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU(),
			nn.Conv2d(in_channels=mid_channels2, out_channels=mid_channels2,
				kernel_size=conv_kernel, padding='same'),
			nn.ReLU(),
			nn.MaxPool2d(pool_kernel),
			nn.Dropout(p=dropout1))
		dim = grid_size
		dim = dim_pool2d(dim, pool_kernel)
		dim = dim_pool2d(dim, pool_kernel)
		self.mid_features = dim * dim * mid_channels2
		self.linear = nn.Sequential(
			nn.Linear(self.mid_features, num_features),
			nn.ReLU(),
			nn.Linear(num_features, num_features),
			nn.ReLU(),
			nn.Dropout(p=dropout2))
		self.classify = nn.Sequential(
			nn.Linear(num_features, num_classes))

	def forward(self, image, apply_softmax=False):
		mid1 = self.conv1(image)
		mid2 = self.conv2(mid1)
		mid3 = mid2.view(-1, self.mid_features)
		mid4 = self.linear(mid3)
		prediction = self.classify(mid4)
		if apply_softmax:
			return F.softmax(prediction, dim=1)
		else:
			return prediction

class SignClassifier():
	def __init__(self, model, classes):
		self.model = model
		self.classes = classes

	def query(self, image):
		distribution = self.model(image.unsqueeze(0), apply_softmax=True).squeeze(0)
		_, indices = torch.sort(distribution, descending=True)
		return [self.classes[index] for index in indices]

class TrainState():
	def __init__(self, model, max_worsening, filename):
		self.model = model
		self.val_losses = [1e8]
		self.best = 1e8
		self.n_worsening = 0
		self.max_worsening = max_worsening
		self.filename = filename

	def update(self, val_loss):
		self.val_losses.append(val_loss)
		if len(self.val_losses) < 2:
			torch.save(self.model.state_dict(), self.filename)
		else:
			loss_prev, loss_curr = self.val_losses[-2:]
			if loss_curr >= loss_prev:
				self.n_worsening += 1
			else:
				if loss_curr < self.best:
					torch.save(self.model.state_dict(), self.filename)
					self.best = loss_curr
				self.n_worsening = 0

	def stop(self):
		return self.n_worsening >= self.max_worsening

def acc_function(pred_dist, truth):
	_, pred = pred_dist.max(dim=1)
	n_correct = torch.eq(pred, truth).sum().item()
	return 100 * n_correct / len(pred)

def run_batch(model, batch, optimizer, loss_function):
	images = batch['image']
	signs = batch['sign']
	if optimizer is not None:
		optimizer.zero_grad()
	pred_dist = model(images)
	loss = loss_function(pred_dist, signs)
	acc = acc_function(pred_dist, signs)
	if optimizer is not None:
		loss.backward()
		optimizer.step()
	return loss.item(), acc
			
def run_batches(model, dataset, args, loss_function, optimizer=None):
	if optimizer is not None:
		model.train()
	else:
		model.eval()
	n_batches = 0
	loss_sum = 0
	acc_sum = 0
	if optimizer is None:
		with torch.no_grad():
			for batch in generate_batches(dataset, args):
				loss, acc = run_batch(model, batch, optimizer, loss_function)
				loss_sum += loss
				acc_sum += acc
				n_batches += 1
	else:
		for batch in generate_batches(dataset, args):
			loss, acc = run_batch(model, batch, optimizer, loss_function)
			loss_sum += loss
			acc_sum += acc
			n_batches += 1
	loss_av = loss_sum / n_batches
	acc_av = acc_sum / n_batches
	return loss_av, acc_av

def train(model, train_set, val_set, args, filename):
	model.to(args.device)
	optimizer = optim.Adam(model.parameters(), lr=args.learning_rate)
	scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer=optimizer)
	if args.weighted_loss:
		loss_function = nn.CrossEntropyLoss(train_set.weights)
	else:
		loss_function = nn.CrossEntropyLoss()
	state = TrainState(model, args.max_worsening, filename)
	for epoch in range(args.n_epochs):
		loss_av_train, acc_av_train = run_batches(model, train_set, args, loss_function,
				optimizer=optimizer)
		loss_av_val, acc_av_val = run_batches(model, val_set, args, loss_function)
		state.update(loss_av_val)
		if args.verbose:
			print('epoch {}: train: {:0.3f} [{:0.2f}%]; val: {:0.3f} [{:0.2f}%]'.format(\
				epoch, loss_av_train, acc_av_train, loss_av_val, acc_av_val))
		if state.stop():
			if args.verbose:
				print('Early stopping')
			break
		scheduler.step(loss_av_val)
	model.load_state_dict(torch.load(filename))
	model.eval()

def train_cnn1(train_set, val_set, grid_size, filename):
	model = SignCnn1(train_set.n_classes, grid_size)
	train(model, train_set, val_set, args, filename)
	return SignClassifier(model, train_set.classes)

def train_cnn2(train_set, val_set, grid_size, filename):
	model = SignCnn2(train_set.n_classes, grid_size)
	train(model, train_set, val_set, args, filename)
	return SignClassifier(model, train_set.classes)

def train_cnn3(train_set, val_set, grid_size, filename):
	model = SignCnn3(train_set.n_classes, grid_size)
	train(model, train_set, val_set, args, filename)
	return SignClassifier(model, train_set.classes)

def train_glyphnet(train_set, val_set, grid_size, filename):
	model = GlyphNet(train_set.n_classes, grid_size)
	train(model, train_set, val_set, args, filename)
	return SignClassifier(model, train_set.classes)

def train_bgk(train_set, val_set, grid_size, filename):
	model = BGK(train_set.n_classes, grid_size)
	train(model, train_set, val_set, args, filename)
	return SignClassifier(model, train_set.classes)
