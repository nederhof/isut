import bcrypt

SALT = b'$2b$12$1YY2jpXLYKi1JPqch5nxee'

if __name__ == "__main__":
	print(bcrypt.gensalt())

