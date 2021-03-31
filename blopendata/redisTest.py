import redis
import subprocess
import os
import re
import numpy as np
from astropy.time import Time
import json
def test1():
    h = 'localhost'
    p = 6379
    r = redis.Redis(host=h,port=p,db=0)
    val = r.get('matt').decode("utf-8")
    print(val,type(val))
    def decode(dict):
        newPairs = []
        for key in dict.keys():
            val = dict[key]
            print(key,val)
            key = key.decode("utf-8")
            # print(key,val)
            # val = val.decode("utf-8")
            # print(val,type(val))

            if key != "raw_x_rms" and key != "raw_y_rms" and key != "raw_freqs":
                val = val.decode("utf-8")
            newPairs.append((key,val))
        dic = {}
        for pair in newPairs:
            dic[pair[0]] = pair[1]
        return dic
    val = r.hgetall('BLP13_spectra_AGBT20A_999_44_0136')
    print(val,type(val))
    val = decode(val)
    print(val,type(val))

# x = subprocess.check_output("~lebofsky/mjd_to_session 58429.28556")
#


def getSession(mjd):
    print(mjd)
    x = subprocess.check_output("/home/lebofsky/mjd_to_session %s"%(mjd),shell=True)
    x=re.split('\t|\n',x)
    session = x[0].split(" ")[-1]
    h = 'localhost'
    p = 6379
    r = redis.Redis(host=h,port=p,db=0)
    scanStrs = r.hkeys("bl_%s_scans"%(session))
    scanNums = [int(val) for val in scanStrs]
    minId = scanStrs[np.argmin(scanNums)]
    mjd = float(r.hget("BLP00_spectra_%s_%s"%(session,minId),"raw_mjd"))
    print(mjd)
    t = Time(mjd,format='mjd')
    print(t.utc.iso)
    tempId = str(t.utc.iso).split(" ")
    tempId[0] = "".join(tempId[0].split("-"))

    tempId[1] = "".join(tempId[1].split(":"))
    tempId[1] = tempId[1].split(".")[0]
    tempId = tempId[0]+"T"+tempId[1]+"Z"
    print(tempId)

#Start times of different periods
A19 = Time('2019-02-01T00:00:00',format='isot')
B19 = Time('2019-08-01T00:00:00',format='isot')
A20 = Time('2020-02-01T00:00:00',format='isot')
B20 = Time('2020-08-01T00:00:00',format='isot')
A21 = Time('2021-02-01T00:00:00',format='isot')
def getTemp(mjd):
    t = Time(float(mjd),format='mjd')
    #year = int(str(t.utc.iso).split("-")[0])
    tag = "21A"
    if t<A19:
        print("too early")
        return
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
    i = np.argmin(diff)
    if diff[i]>.5:
        return
    key = keys[i]
    result = str(r.hget("OREO_TSYS_"+tag,key))
    result = result.split(",")
    result = '{"reciever":"' + result[0].split(":")[-1] +'",'+' ,'.join(result[1:])[:-1]
    if result[-1]!="}":
        result = result + "}"
    print(result)
    result = eval(result)
    print(result['measured'])
def toTime(dateString):
    newStr = dateString[:4]+"-"+dateString[4:6]+"-"+dateString[6:11]+":"+dateString[11:13]+":"+dateString[13:15]
    print(newStr)
    return Time(newStr, format = 'isot',scale='utc')



getTemp("58429.28556")
getTemp("58642.226261574076")
#getSession("58900")
