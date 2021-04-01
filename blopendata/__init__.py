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

app.config['MYSQL_DATABASE_USER'] = 'ggroode'
app.config['MYSQL_DATABASE_PASSWORD'] = ''
app.config['MYSQL_DATABASE_DB'] = 'btldata'
app.config['MYSQL_DATABASE_HOST'] = 'localhost'

#I believe you should comment about above set of instructions and Uncomment the ones below but not 100% sure those are correct.

# app.config['MYSQL_DATABASE_USER'] = 'readonly'
# app.config['MYSQL_DATABASE_PASSWORD'] = ''
# app.config['MYSQL_DATABASE_DB'] = 'btldata'
# app.config['MYSQL_DATABASE_HOST'] = 'bl-db'

if test_config is None:
    # load the instance config, if it exists, when not testing
    app.config.from_pyfile('config.py', silent=True)
else:
    # load the test config if passed in
    app.config.from_mapping(test_config)

mysql = MySQL()
print(1)
# MySQL configurations
app.config['TEMPLATES_AUTO_RELOAD'] = True
mysql.init_app(app)
print(2)
# ensure the instance folder exists
try:
    os.makedirs(app.instance_path)
except OSError:
    pass
print(3)
from . import core
app.register_blueprint(core.bp)
print(4)
Compress(app)
print(5)
@app.errorhandler(400)
def custom400(error):
    response = jsonify({'message': error.description['message']})
