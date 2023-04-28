# Isut

Tool for collaborative annotation and computational analysis of hieratic texts.

By Mark-Jan Nederhof, Julius Tabin and Christian Casey.

## Installation

### MongoDB

On Linux, MongoDB is typically installed with:

```
sudo apt install mongodb-org

```
MongoDB is typically started up with:

```
sudo systemctl start mongod
```

### Python

On Linux, the relevant Python packages are typically installed with:

```
pip3 install bcrypt
pip3 install numpy
pip3 install Pillow
pip3 install pymongo
pip3 install scikit-learn-extra
pip3 install umap-learn
```

(On some platforms it is ``pip`` rather than ``pip3``.)

### Node.js

On Linux, Node.js and nodemon are typically installed with:

```
sudo apt install npm
sudo npm install -g nodemon
```

The relevant modules of Isut are now installed with:

```
cd src
npm install
```

Find out how Python3 is called on your machine. If it is not ``python3``, then
edit line 5 of ``routes/util.js`` to adjust the definition of ``python``.

## Local use

### Configure

(Only needed if you want to create or edit texts and want
your username to be recorded in the edit history of those texts.)

Choose a username for yourself,
and edit line 11 of ``routes/util.js`` to
adjust the definition of ``defaultUser`` to be your username.

### Running

Call:

```
nodemon
```

If all is well, the output will typically include something like:

```
Listening on 3000
Database opened
```

Now direct the browser to:

```
http://localhost:3000/isut
```

### Loading and annotating texts

In the application, you can load the existing annotated texts from ``backups/``. 

Regrettably PeasantB1.zip had to be split up due to GitHub's file size limit.
To reconstruct it, do: 
```
cd ../backups
cat PeasantB1Part* > PeasantB1.zip
```

You can also create your own annotated texts. Before doing your own annotation, the OCR
functionality needs to be initialized on the basis of a number of annotated texts
that were already loaded into the application. This is done by:

```
python3 python/prepare.py
```

It may be worth repeating this once many more annotated texts have been added to the
application.

### Backups

You can make backups of the texts currently in the database by:

```
python3 python/backups.py
```

The texts will be stored as zip files in ``backups/``. Note that this will not replace
any existing files, so you need to empty the contents of ``backups/`` first, or
move the files elsewhere.

## Deployment on the web

### Configure

Edit ``routes/util.js`` and edit line 8 to assign ``true`` to ``online``.

### MongoDB

It may be necessary to set up a password for access of MongoDB.

To be continued...

### Salt

To choose a fresh value of salt, run:

```
python3 python/salt.py
```

Make a note of the output value. Update both ``python/salt.py`` and ``routes/salt.js`` 
to assign this value to ``SALT``.

### User administration

Choose a username and password for yourself, and give yourself editor
permissions with:

```
python3 python/addeditor.py -u <username> -p <password> -n "<name>"
```

replacing the ``<username>``, ``<password>`` and ``<name>`` by appropriate
strings. Avoid spaces in username and password.

### Running

If end users can access the application at:

```
https://mydomain.com/isut
```

then you can log in as editor with the chosen credentials at:

```
https://mydomain.com/isut/admin/login
```

After logging in, user administration can be done via the web interface.
