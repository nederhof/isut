def get_safe(im, x, y, grid_size, bilevel):
	if x < 0 or x >= grid_size or y < 0 or y >= grid_size:
		return 1 if bilevel else 255
	else:
		return im[x][y].astype(int)

def compare_window(im1, im2, x1, y1, x2, y2, grid_size, context, bilevel):
	cost = 0
	for xd in range(-context, context+1):
		for yd in range(-context, context+1):
			diff = get_safe(im1, x1+xd, y1+yd, grid_size, bilevel) - get_safe(im2, x2+xd, y2+yd, grid_size, bilevel)
			cost += diff * diff
	return cost

def compare_warped(im1, im2, x1, y1, grid_size, warp, context, bilevel):
	pixel_cost = 1 if bilevel else 255*255
	best_cost = (1 + 2 * context) * (1 + 2 * context) * pixel_cost
	for x2 in range(x1-warp, x1+warp+1):							
		for y2 in range(y1-warp, y1+warp+1):						
			cost = compare_window(im1, im2, x1, y1, x2, y2, grid_size, context, bilevel)	
			if cost < best_cost:									
				best_cost = cost									
	return best_cost												
																	
# image distortion distance between two bilevel images
def distortion_distance(im1, im2, grid_size, warp=0, context=0, bilevel=False):
	diff = 0														
	for x in range(grid_size):											
		for y in range(grid_size):										
			diff += compare_warped(im1, im2, x, y, grid_size, warp, context, bilevel)	
	return diff
