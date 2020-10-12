from astropy.time import Time
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



sql_cmd = 'Drop View If Exists processed'
sql_args = []
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
conn.close()




sql_cmd = 'Create View processed as SELECT * FROM files where project = %s or (project = %s and target_name Like %s)'
sql_args = ['GBT','parkes','%\\__']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
conn.close()



sql_cmd = 'Drop View If Exists cadences'
sql_args = []
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
conn.close()




sql_cmd = 'Create View cadences as SELECT * FROM files where (project = %s or (project = %s and target_name Like %s)) and cadence != %s'
sql_args = ['GBT','parkes','%\\__','Unknown']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
conn.close()



sql_cmd = 'SELECT Count(*) as count FROM files'
sql_args = []
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

totalFiles = table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM processed'
sql_args = []
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

totalProcessed = table[0][0]



print("Total Files processed: {} / {}".format(totalProcessed,totalFiles))




sql_cmd = 'SELECT Count(*) as count FROM cadences'
sql_args = []
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

totalFound = table[0][0]


print("Total Cadences found: {} / {}".format(totalFound,totalProcessed))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s'
sql_args = ['GBT']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

gbtFiles = table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s'
sql_args = ['GBT']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

gbtFound= table[0][0]


print("Total Greenbank Cadences found: {} / {}".format(gbtFound,gbtFiles))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s'
sql_args = ['parkes']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

parkesFiles = table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s'
sql_args = ['parkes']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

parkesFound= table[0][0]


print("Total Processed_Parkes Cadences found: {} / {}".format(parkesFound,parkesFiles))

sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and not target_name Like %s'
sql_args = ['GBT','FRB%']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and not target_name Like %s'
sql_args = ['GBT','FRB%']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Greenbank Cadences (Minus FRB Data) found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','HDF5']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','HDF5']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Greenbank HDF5 Cadences (Minus FRB Data) found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','baseband data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','baseband data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Greenbank baseband Cadences (Minus FRB Data) found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Greenbank fits Cadences (Minus FRB Data) found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','filterbank']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and not target_name Like %s and file_type = %s'
sql_args = ['GBT','FRB%','filterbank']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Greenbank filterbank Cadences (Minus FRB Data) found: {} / {}".format(found,files))




sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and file_type = %s'
sql_args = ['parkes','HDF5']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and file_type = %s'
sql_args = ['parkes','HDF5']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Parkes HDF5 Cadences found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and file_type = %s'
sql_args = ['parkes','baseband data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and file_type = %s'
sql_args = ['parkes','baseband data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Parkes baseband Cadences found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and file_type = %s'
sql_args = ['Parkes','data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and file_type = %s'
sql_args = ['parkes','data']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Parkes fits Cadences found: {} / {}".format(found,files))


sql_cmd = 'SELECT Count(*) as count FROM processed where project = %s and file_type = %s'
sql_args = ['parkes','filterbank']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

files= table[0][0]


sql_cmd = 'SELECT Count(*) as count FROM cadences where project = %s and file_type = %s'
sql_args = ['parkes','filterbank']
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd, sql_args)
table = cursor.fetchall()
conn.close()

found= table[0][0]


print("Total Parkes filterbank Cadences found: {} / {}".format(found,files))
