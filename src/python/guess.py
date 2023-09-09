import sys
import json
import re
from binascii import a2b_base64
from io import BytesIO
import base64
from PIL import Image, ImageOps

from classification import classify_distribution

def classify(sign):
	imgstr = re.search(r'base64,(.*)', sign).group(1)
	image = Image.open(BytesIO(a2b_base64(imgstr)))
	image = image.convert('RGB')
	inverted = ImageOps.invert(image)
	bbox = inverted.getbbox()
	if not bbox:
		return []
	else:
		image = image.crop(bbox)
		return classify_distribution(image, 5)

def main():
	sign = sys.argv[1]
	try:
		results = classify(sign)
		sys.stdout.write(json.dumps(results))
	except Exception as e:
		sys.stderr.write(str(e))

if __name__ == '__main__':
	main()
