from collections import defaultdict

import includemain
from prepare import token_list

def main():
	tokens = token_list()
	tokens = [token for token in tokens if len(token['sign']) == 1]
	types = list({token['sign'] for token in tokens})
	nTokens = len(tokens)
	nTypes = len(types)
	print('Number of types:', nTypes, '; number of tokens:', nTokens)
	freqs = defaultdict(int)
	for token in tokens:
		freqs[token['sign']] += 1
	types.sort(key=lambda t: freqs[t], reverse=True)
	total = 0
	rank = 0
	for t in types:
		rank += 1
		total += freqs[t]
		portion = total / nTokens
		print(rank, t, total, portion)

if __name__ == '__main__':                                                          
	main()
