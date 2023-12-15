import json
import re
import collections
from collections import defaultdict

with open('results/classifications.json', 'r') as f:
	classifications = json.load(f)

truths = [p['truth'] for p in classifications]
machines = [p['machine'] for p in classifications]
names = truths + machines

common_freq = collections.Counter(names).most_common(15)
common_names = [p[0] for p in common_freq]

def name_to_tuple(name):
	result = re.match('([A-Z]|[K-Z]|Aa|NL|NU)([0-9]{1,3})([a-z]?)', name)
	if result:
		return (result[1], int(result[2]), result[3])
	else:
		return (0, 0, 0)

common_sorted = sorted(common_names, key = lambda name: name_to_tuple(name))

n = len(common_sorted)

pair_freq = defaultdict(int)

for p in classifications:
	pair_freq[(p['truth'], p['machine'])] += 1

pre = '''\\documentclass[runningheads]{llncs}

\\begin{document}

'''

post = '''\\end{document}'''

table_header = '\\begin{tabular}{cc|' + (n * 'c') + '}\n'

table_first_row = '&' + ''.join(['& ' + name for name in common_sorted]) + '\\\\\n'
table_second_row ='&' + ''.join(['& ' + name for name in common_sorted]) + '\\\\\n\\hline\n'

table_rows = ''

for name1 in common_sorted:
	table_rows += name1 + '&' + name1
	for name2 in common_sorted:
		table_rows += '&'
		if pair_freq[(name1, name2)] > 0:
			table_rows += str(pair_freq[(name1, name2)])
	table_rows += '\\\\\n'

table_footer = '\\end{tabular}\n\n'

table = table_header + table_first_row + table_second_row + table_rows + table_footer

latex = pre + table + post

with open('results/table.tex', 'w') as f:
	f.write(latex)
