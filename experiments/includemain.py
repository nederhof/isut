import os
import sys

this_dir = os.path.dirname(__file__)
root_dir = os.path.dirname(this_dir)
main_dir = os.path.join(root_dir, 'src', 'python')
sys.path.append(main_dir)
