from astropy.time import Time
import os
from flask import Flask
from flaskext.mysql import MySQL
from flask_compress import Compress
import redis
import json
import numpy as np

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
        return ([],[],[])
    TOLERANCE = 10
    oldTime = data[0]['utc']
    oldTarget = data[0]['target']
    #oldTime = int(time.split(":")[1]) + int(time.split(":")[2])/60.
    indices = [0]
    targets = [data[0]['target']]
    times = [data[0]['utc']]
    index=0
    for i in range(1,len(data)):
        entry = data[i]
        # time = str(entry['utc']).split(" ")[1]
        # min = int(time.split(":")[1])
        # sec = int(time.split(":")[2])
        newTime = entry['utc']
        newTarget = entry['target']
        if newTime >= oldTime + timedelta(seconds=TOLERANCE) or newTarget != oldTarget:
            targets.append(newTarget)
            times.append(newTime)
            oldTime = newTime
            oldTarget = newTarget
            index+=1
        indices.append(index)
    return targets,indices,times


def isCadence(index,targets):
    return targets[index]==targets[index+2] and targets[index]==targets[index+4] and targets[index]!= targets[index+1] and targets[index]!=targets[index+3] and targets[index]!=targets[index+5]

def isPartialCadence(index,targets):
    return targets[index]==targets[index+2]  and targets[index]!= targets[index+1] and targets[index] != targets[index+3]

def getCadenceSet(ind,index,targets,times):
    TOLERANCE = 30*60
    ind = index[ind]
    toReturn = [targets[ind]]
    time = times[ind]
    for i in range(ind+1,min(ind+6,len(targets))):
        if times[i] > time + timedelta(seconds=TOLERANCE):
            break
        toReturn.append(targets[i])
        time = times[i]
    return toReturn


#TODO make this modular
A19 = Time('2019-02-01T00:00:00',format='isot')
B19 = Time('2019-08-01T00:00:00',format='isot')
A20 = Time('2020-02-01T00:00:00',format='isot')
B20 = Time('2020-08-01T00:00:00',format='isot')
A21 = Time('2021-02-01T00:00:00',format='isot')
def getTemp(mjd,band):
    t = Time(float(mjd),format='mjd')
    #year = int(str(t.utc.iso).split("-")[0])
    tag = "21A"
    if t<A19:
        return ("Unknown","Unknown","Unknown")
    elif t<B19:
        tag = "19A"
    elif t<A20:
        tag = "19B"
    elif t<B20:
        tag = "20A"
    elif t<A21:
        tag = "20B"
    h = 'localhost'
    p = 6379
    r = redis.Redis(host=h,port=p,db=0)
    keys = r.hkeys("OREO_TSYS_"+tag)
    times = [toTime(k.decode("utf-8")) for k in keys]
    diff = [abs(time - t) for time in times]
    while len(keys)>0:
        i = np.argmin(diff)
        if diff[i]>.5:
            return ("Unknown","Unknown","Unknown")
        key = keys.pop(i)
        result = str(r.hget("OREO_TSYS_"+tag,key))
        result = result.split(",")
        result = '{"reciever":"' + result[0].split(":")[-1] +'",'+' ,'.join(result[1:])[:-1]
        if result[-1]!="}":
            result = result + "}"
        result = eval(result)
        if toBand(result["reciever"]) == band:
            return float(result['forecast']),float(result['measured'][0]),float(result['measured'][1])
        diff.pop(i)
    return ("Unknown","Unknown","Unknown")

recieverToBand = {"Rcvr1_2":"L","Rcvr2_3":"S","Rcvr4_6":"C","Rcvr8_10":"X","Rcvr8_12":"X","Rcvr12_18":"Ku","Rcvr18_26":"K"}
def toBand(input):
    if type(input)==str:
        return recieverToBand[input]
    else:
        if input < 2000:
            return "L"
        elif input < 4000:
            return "S"
        elif input <8000:
            return "C"
        elif input < 12000:
            return "X"
        elif input < 18000:
            return "Ku"
        return "K"


def toTime(dateString):
    newStr = dateString[:4]+"-"+dateString[4:6]+"-"+dateString[6:11]+":"+dateString[11:13]+":"+dateString[13:15]
    print(newStr)
    return Time(newStr, format = 'isot',scale='utc')

def updateTemp(id,temp):
    print(id,temp)
    forecast = temp[0]
    tempX = temp[1]
    tempY = temp[2]

    sql_cmd = "Update files Set tempForecast = %s Where id = %s;"
    #orig_print(id)
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd,[forecast,id])
    conn.commit()
    cursor.close()
    conn.close()

    sql_cmd = "Update files Set tempX = %s Where id = %s;"
    #orig_print(id)
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd,[tempX,id])
    conn.commit()
    cursor.close()
    conn.close()

    sql_cmd = "Update files Set tempY = %s Where id = %s;"
    #orig_print(id)
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd,[tempY,id])
    conn.commit()
    cursor.close()
    conn.close()

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
#for day in range(57348,59015):
for day in range(57348,57349):
    #Fetch data
    sql_cmd = 'SELECT * FROM files WHERE '
    sql_args = []

    # t_start = Time(day, format='mjd')
    # #print(t_start.utc.iso)
    # sql_cmd +=  " utc_observed >= %s"
    # sql_args.append(str(t_start.utc.iso))
    #
    # t_end = Time(day+1, format='mjd')
    # sql_cmd +=  " AND utc_observed <= %s"
    # sql_args.append(str(t_end.utc.iso))

    sql_cmd += "project = %s"
    sql_args.append("GBT")
    sql_cmd += " ORDER BY utc_observed"

    print(sql_cmd % (sql_args[0]))
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
        entry['center_freq'] = row[6]
        entry['mjd'] = Time(str(row[2]), format='iso').mjd #For efficiency sake should probobly change this later since it is just being converted back into utc within the method
        entry['cadence-url'] = row[11]
        data.append(entry)
    #print(data)


    #Find cadences
    skip =0
    url = 'Unknown'
    temp = (0,0,0)
    targets, indices,times = getTargets(data)
    for i in range(len(data)):
        print(i)
        id =data[i]['id']
        if skip<0:
            0/0
        if skip:
            skip-=1
            sql_cmd = "Update files Set cadence = %s Where id = %s;"

            #orig_print(id)
            conn = mysql.connect()
            cursor = conn.cursor()
            print(sql_cmd % (url,id))
            cursor.execute(sql_cmd,[url,id])
            conn.commit()
            cursor.close()
            conn.close()
            updateTemp(id,temp)
        else:
            index = indices[i]
            # stop = min(index+6,len(target))
            targetSet = getCadenceSet(i,indices,targets,times)
            temp = getTemp(data[i]['mjd'],toBand(data[i]['center_freq']))
            updateTemp(id,temp)
            print(targetSet)
            print(times[index:index+6])
            if len(targetSet)==6 and isCadence(0,targetSet):
                index = indices.index(index)
                num = indices.index(min(len(targets)-1,indices[index]+6))-index
                url = id
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
                #orig_print(id)
                conn = mysql.connect()
                cursor = conn.cursor()
                print(sql_cmd % (url,id))
                cursor.execute(sql_cmd,[url,id])
                conn.commit()
                cursor.close()
                conn.close()
            elif len(targetSet)>=4 and isPartialCadence(0,targetSet):
                index = indices.index(index)
                num = indices.index(min(len(targets)-1,indices[index]+4))-index
                url = id
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
                #orig_print(id)
                conn = mysql.connect()
                cursor = conn.cursor()
                print(sql_cmd % (url,id))
                cursor.execute(sql_cmd,[url,id])
                conn.commit()
                cursor.close()
                conn.close()
            else:
                sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
                #print(sql_cmd,[id])
                conn = mysql.connect()
                cursor = conn.cursor()
                print(sql_cmd %(id))
                cursor.execute(sql_cmd,[id])
                conn.commit()
                cursor.close()
                conn.close()

0/0
#Parkes data
#for day in range(57348,59001):
for day in range(57348,59015):
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
    targets, indices,times = getTargets(data)
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
            index = indices[i]
            stop = min(index+6,len(data)-1)
            targetSet = targets[index:stop]
            print(targetSet)
            if len(targetSet)==6 and isCadence(0,targetSet):
                print('Success')
                index = indices.index(index)
                num = indices.index(min(len(targets)-1,indices[index]+6))-index
                url = id
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
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
                url = id
                skip = num-1
                sql_cmd = "Update files Set cadence = %s Where id = %s;"
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
