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
# print(2)
# # ensure the instance folder exists
# try:
#     os.makedirs(app.instance_path)
# except OSError:
#     pass
# print(3)
# from . import core
# app.register_blueprint(core.bp)
# print(4)
# Compress(app)
# print(5)
# @app.errorhandler(400)
# def custom400(error):
#     response = jsonify({'message': error.description['message']})









from datetime import timedelta
def getTargets(data):
    if len(data)==0:
        return []
    TOLERANCE = 10
    oldTime = data[0]['utc']
    #oldTime = int(time.split(":")[1]) + int(time.split(":")[2])/60.
    indices = [0]
    targets = [data[0]['target']]
    index=0
    for i in range(1,len(data)):
        entry = data[i]
        # time = str(entry['utc']).split(" ")[1]
        # min = int(time.split(":")[1])
        # sec = int(time.split(":")[2])
        newTime = entry['utc']
        if newTime >= oldTime + timedelta(seconds=TOLERANCE):
            targets.append(entry['target'])
            oldTime = newTime
            index+=1
        indices.append(index)
    return targets,indices


def isCadence(index,targets):
    return targets[index]==targets[index+2] and targets[index]==targets[index+4] and targets[index]!= targets[index+1] and targets[index]!=targets[index+3] and targets[index]!=targets[index+5]

def isPartialCadence(index,targets):
    return targets[index]==targets[index+2]  and targets[index]!= targets[index+1] and targets[index] != targets[index+3]

#
sql_cmd = "Update files Set cadence = %s Where project != %s and (project != %s or not target_name LIKE %s);"
#orig_print(id)
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute(sql_cmd,["Unknown","GBT", "parkes", "%\\__"])
conn.commit()
cursor.close()
conn.close()




#GBT work
#for day in range(57348,59001):
if(True):
    for day in range(57348,59001):
        #Fetch data
        sql_cmd = 'SELECT * FROM files WHERE '
        sql_args = []

        t_start = Time(day, format='mjd')
        #print(t_start.utc.iso)
        sql_cmd +=  " utc_observed >= %s"
        sql_args.append(str(t_start.utc.iso))

        t_end = Time(day+1, format='mjd')
        sql_cmd +=  " AND utc_observed <= %s"
        sql_args.append(str(t_end.utc.iso))

        sql_cmd += " AND project = %s"
        sql_args.append("GBT")
        sql_cmd += " ORDER BY utc_observed"
        conn = mysql.connect()
        cursor = conn.cursor()
        cursor.execute(sql_cmd, sql_args)
        table = cursor.fetchall()
        conn.close()


        data = []
        for row in table:
            entry = {}
            entry['id'] = row[0]
            entry['target'] = row[3]
            entry['url'] = row[10]
            entry['utc'] = row[2]
            entry['cadence-url'] = row[11]
            data.append(entry)



        #Find cadences
        skip =0
        url = 'Unknown'
        for i in range(len(data)):
            print(i)
            id =data[i]['id']
            if skip:
                skip-=1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
                print(id,url)
                #orig_print(id)
                conn = mysql.connect()
                cursor = conn.cursor()
                cursor.execute(sql_cmd,[url,id])
                conn.commit()
                cursor.close()
                conn.close()
            else:
                targets, indices = getTargets(data)
                index = indices[i]
                stop = min(index+6,len(data)-1)
                targetSet = targets[index:stop]
                print(targetSet)
                if len(targetSet)==6 and isCadence(0,targetSet):
                    index = indices.index(index)
                    num = indices.index(min(len(targets)-1,indices[index]+6))-index
                    url = str(num) +'--' + data[index]['url'].split("/")[-1]
                    skip = num-1
                    sql_cmd = "Update files Set cadence = %s Where id = %s;"
                    id = entry['id']
                    #orig_print(id)
                    conn = mysql.connect()
                    cursor = conn.cursor()
                    cursor.execute(sql_cmd,[url,id])
                    conn.commit()
                    cursor.close()
                    conn.close()
                elif len(targetSet)>=4 and isPartialCadence(0,targetSet):
                    index = indices.index(index)
                    num = indices.index(min(len(targets)-1,indices[index]+4))-index
                    url = str(num) +'--' + data[index]['url'].split("/")[-1]
                    skip = num-1
                    sql_cmd = "Update files Set cadence = %s Where id = %s;"
                    id = entry['id']
                    #orig_print(id)
                    conn = mysql.connect()
                    cursor = conn.cursor()
                    cursor.execute(sql_cmd,[url,id])
                    conn.commit()
                    cursor.close()
                    conn.close()
                else:
                    sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
                    #print(sql_cmd,[id])
                    conn = mysql.connect()
                    cursor = conn.cursor()
                    cursor.execute(sql_cmd,[id])
                    conn.commit()
                    cursor.close()
                    conn.close()


#Parkes data
#for day in range(57348,59001):
for day in range(57348,59001):
    #Fetch data
    sql_cmd = 'SELECT * FROM files WHERE '
    sql_args = []

    t_start = Time(day, format='mjd')
    #print(t_start.utc.iso)
    sql_cmd +=  " utc_observed >= %s"
    sql_args.append(str(t_start.utc.iso))

    t_end = Time(day+1, format='mjd')
    sql_cmd +=  " AND utc_observed <= %s"
    sql_args.append(str(t_end.utc.iso))

    sql_cmd += " AND project = %s"
    sql_args.append("parkes")
    sql_cmd += " AND target_name LIKE %s"
    sql_args.append("%\\__")
    sql_cmd += " ORDER BY utc_observed"
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd, sql_args)
    table = cursor.fetchall()
    conn.close()


    data = []
    for row in table:
        entry = {}
        entry['id'] = row[0]
        entry['target'] = row[3]
        entry['url'] = row[10]
        entry['utc'] = row[2]
        entry['cadence-url'] = row[11]
        data.append(entry)



    #Find cadences
    skip =0
    url = 'Unknown'
    for i in range(len(data)):
        #print(i)
        id =data[i]['id']
        if skip:
            skip-=1
            sql_cmd = "Update files Set cadence = %s Where id = %s;"
            #print(id,url)
            #orig_print(id)
            conn = mysql.connect()
            cursor = conn.cursor()
            cursor.execute(sql_cmd,[url,id])
            conn.commit()
            cursor.close()
            conn.close()
        else:
            targets, indices = getTargets(data)
            index = indices[i]
            stop = min(index+6,len(data)-1)
            targetSet = targets[index:stop]
            print(targetSet)
            if len(targetSet)==6 and isCadence(0,targetSet):
                print('Success')
                index = indices.index(index)
                num = indices.index(min(len(targets)-1,indices[index]+6))-index
                url = str(num) +'--' + data[index]['url'].split("/")[-1]
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
                id = entry['id']
                #orig_print(id)
                conn = mysql.connect()
                cursor = conn.cursor()
                cursor.execute(sql_cmd,[url,id])
                conn.commit()
                cursor.close()
                conn.close()
            elif len(targetSet)>=4 and isPartialCadence(0,targetSet):
                index = indices.index(index)
                num = indices.index(min(len(targets)-1,indices[index]+4))-index
                url = str(num) +'--' + data[index]['url'].split("/")[-1]
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
                id = entry['id']
                #orig_print(id)
                conn = mysql.connect()
                cursor = conn.cursor()
                cursor.execute(sql_cmd,[url,id])
                conn.commit()
                cursor.close()
                conn.close()
            else:
                sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
                #print(sql_cmd,[id])
                conn = mysql.connect()
                cursor = conn.cursor()
                cursor.execute(sql_cmd,[id])
                conn.commit()
                cursor.close()
                conn.close()
