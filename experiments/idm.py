from heapq import nsmallest

from classification2 import filter_distance
from imagedistortion import distortion_distance

class IDM:
	def __init__(self, grid_size, warp, context):
		self.grid_size = grid_size
		self.warp = warp
		self.context = context
		self.grids = []
		self.tokens = []

	def add(self, grid, token):
		self.grids.append(grid)
		self.tokens.append(token)

	def query(self, grid, k=1):
		distances = [distortion_distance(old_grid, grid, self.grid_size, self.warp, self.context) \
						for old_grid in self.grids]
		candidates = nsmallest(k, range(len(self.grids)), key=lambda i : distances[i])
		return [self.tokens[i] for i in candidates]
