import numpy as np
from scipy.spatial import KDTree

class Indexing:
	def __init__(self):
		self.vectors = []
		self.labels = []

	def add(self, vector, label):
		self.vectors.append(vector)
		self.labels.append(label)

	def finalize(self):
		self.tree = KDTree(self.vectors)

	def query(self, vector, k=1):
		_, indexes = self.tree.query(vector, k=k)
		return [self.labels[i] for i in np.nditer(indexes)]
