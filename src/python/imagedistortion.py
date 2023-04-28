def get_safe(im, x, y, grid_size):
	if x < 0 or x >= grid_size or y < 0 or y >= grid_size:
		return True
	else:
		return im[x][y]

def compare_window(im1, im2, x1, y1, x2, y2, grid_size, context=0):
	cost = 0
	for xd in range(-context, context+1):
		for yd in range(-context, context+1):
			if get_safe(im1, x1+xd, y1+yd, grid_size) != get_safe(im2, x2+xd, y2+yd, grid_size):
				cost += 1
	return cost

def compare_warped(im1, im2, x1, y1, grid_size, warp=0, context=0):
	best_cost = (1 + 2 * context) * (1 + 2 * context)
	for x2 in range(x1-warp, x1+warp+1):							
		for y2 in range(y1-warp, y1+warp+1):						
			cost = compare_window(im1, im2, x1, y1, x2, y2, grid_size, context=context)	  
			if cost < best_cost:									
				best_cost = cost									
	return best_cost												
																	
# image distortion distance between two bilevel images
def distortion_distance(im1, im2, grid_size, warp=0, context=0):			   
	diff = 0														
	for x in range(grid_size):											  
		for y in range(grid_size):										  
			diff += compare_warped(im1, im2, x, y, grid_size, warp=warp, context=context)	
	return diff
