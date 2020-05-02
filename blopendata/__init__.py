import os
from flask import Flask
from flaskext.mysql import MySQL
from flask_compress import Compress

test_config = None

app = Flask(__name__, instance_relative_config=True)

# create and configure the app
app.config.from_mapping(
    SECRET_KEY='dev',
    DEBUG=True
)

# app.config['MYSQL_DATABASE_USER'] = 'vb24576'
# app.config['MYSQL_DATABASE_PASSWORD'] = ''
# app.config['MYSQL_DATABASE_DB'] = 'btldata'
# app.config['MYSQL_DATABASE_HOST'] = '107.178.214.242'
app.config['MYSQL_DATABASE_USER'] = 'readonly'
app.config['MYSQL_DATABASE_PASSWORD'] = ''
app.config['MYSQL_DATABASE_DB'] = 'btldata'
app.config['MYSQL_DATABASE_HOST'] = 'bl-db'

if test_config is None:
    # load the instance config, if it exists, when not testing
    app.config.from_pyfile('config.py', silent=True)
else:
    # load the test config if passed in
    app.config.from_mapping(test_config)

mysql = MySQL()

# MySQL configurations
app.config['TEMPLATES_AUTO_RELOAD'] = True
mysql.init_app(app)

# ensure the instance folder exists
try:
    os.makedirs(app.instance_path)
except OSError:
    pass

from . import core
app.register_blueprint(core.bp)

Compress(app)

@app.errorhandler(400)
def custom400(error):
    response = jsonify({'message': error.description['message']})
