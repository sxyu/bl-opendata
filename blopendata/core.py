import functools, os, sys
import numpy as np
import tempfile
import matplotlib.pyplot as plt
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, send_from_directory, jsonify, abort, current_app
)
from werkzeug.utils import secure_filename
from astropy import units as u
from astropy.time import Time
from astropy.coordinates import SkyCoord
from astroquery.simbad import Simbad
import pickle
from . import mysql

DATA_FOLDER = 'data'
PUBLIC_FOLDER = '../data'
TMP_FOLDER = 'tmp'
SYS_TMP_FOLDER = tempfile.gettempdir()

STATIC_FOLDER = os.path.join('blopendata', 'static')
SIMBAD_CACHE_PATH = os.path.join(DATA_FOLDER, 'simbad-ids.pkl')

bp = Blueprint('core', __name__, url_prefix='/')
## Gavin
import requests
from statistics import mode
openDataAPI ="http://35.236.84.6:5001/api/"
grades = {"fine","mid","time"}
fil_grades = {"0000":"fine","0001":"time","0002":"mid"}


### End Gavin

simbad_cache = {}
def _query_simbad(target):
    """ query SIMBAD database for synonyms for 'target' """
    global simbad_cache
    target = target.strip();
    if target not in simbad_cache.keys():
        ids = None
        clean_exts = ['_OFF', '_OFFA', '_OFFB']
        ids = Simbad.query_objectids(target)
        if ids is not None:
            ids_lst = []
            for id in ids:
                spl = id[0].split()
                if spl[0] == '*' or spl[0] == '**' or spl[0] == 'V*':
                    spl[0] = "" # cut off *, **, V*
                if spl[0] == "NAME":
                    # put at beginning
                    ids_lst.append(ids_lst[0] if len(ids_lst) > 0 else 0)
                    ids_lst[0] = ' '.join(spl[1:])
                else:
                    # cut off space, unless first word is surrounded by []
                    if len(spl[0]) == 0 or spl[0][-1] != ']':
                        ids_lst.append(spl[0] + ' '.join(spl[1:]))
                    else:
                        # do not remove first space
                        ids_lst.append(' '.join(spl))
            simbad_cache[target] = ids_lst
            if target not in ids_lst:
                ids_lst.append(target)
        else:
            simbad_cache[target] = [target]
    return simbad_cache[target]

# cache SIMBAD
if os.path.exists(SIMBAD_CACHE_PATH):
    simbad_cache = pickle.load(open(SIMBAD_CACHE_PATH, 'rb'))
conn = mysql.connect()
cursor = conn.cursor()
cursor.execute('SELECT DISTINCT target_name FROM files')
targets = [x[0] for x in cursor.fetchall()]
conn.close()
print("Rerunning SIMBAD ID queries...")
simbad_reran = 0
for target in targets:
    if target not in simbad_cache.keys():
        simbad_reran += 1
    _query_simbad(target)
print("Done with SIMBAD queries, reran a total of", simbad_reran, "queries")
pickle.dump(simbad_cache, open(SIMBAD_CACHE_PATH, 'wb'))

@bp.route('/', methods=('GET', 'POST'))
def home():
    # home page
    return render_template('core/home.html', wat_image=request.args.get('wat_image'))

@bp.route('/data/<path:filename>', methods=('GET',))
def serve_public(filename):
    # serve a public file
    return send_from_directory(PUBLIC_FOLDER, filename)

# API
@bp.route('/api/list-targets', methods=('GET', 'POST'))
def api_list_targets():
    """ get list of all targets in the database at this time """
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT target_name FROM files')
    targets = [x[0] for x in cursor.fetchall()]
    conn.close()
    if 'simbad' in request.args:
        target_dict = {}
        for target in targets:
            target_dict[target] = _query_simbad(target)
        return jsonify(target_dict)
    else:
        return jsonify(targets)

@bp.route('/api/list-telescopes', methods=('GET', 'POST'))
def api_list_telescopes():
    """ get list of all telescopes in the database at this time """
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT project FROM files')
    projects = cursor.fetchall()
    conn.close()
    return jsonify(projects)

@bp.route('/api/list-file-types', methods=('GET', 'POST'))
def api_list_file_types():
    """ get list of all file type names in the database at this time """
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT file_type FROM files')
    ftypes = cursor.fetchall()
    conn.close()
    return jsonify(ftypes)


orig_print = print
print = str


@bp.route('/api/query-files', methods=('GET', 'POST'))
def api_query():
    """
    query for a list of files with associated info
    possible arguments: target, telescopes (comma-sep), file-types (comma-sep),
                        pos-ra, pos-dec, pos-rad, time-start, time-end, freq-start, freq-end, limit
                        cadence, grades
    returns: dictionary d with d["result"] in {"success", "error"}
                               d["message"] set to message on result "error"
                               d["data"] set to query result set on result "success"
                                         is a list of dictionaries, each with keys
                                         ['target', 'telescope', 'utc', 'mjd', 'ra',
                                          'decl', 'center_freq', 'file_type', 'size', 'md5sum', 'url']
    """
    # get args
    print("Query began")
    if 'target' not in request.args:
        return jsonify({'result': 'error', 'message': 'Target is required'})
    print(request.args)

    target = request.args.get('target')

    sql_cmd = 'SELECT * FROM files WHERE target_name'
    sql_args = []

    if len(target) > 1 and target[0] in ['!', '/']:
        if target[0] == '!':
            sql_cmd += ' = %s'
        elif target[0] == '/':
            sql_cmd += ' REGEXP %s'
        sql_args.append(target[1:])
    else:
        sql_cmd += ' LIKE %s'
        sql_args.append('%' + target + ('%' if target else ''))

    if 'telescopes' in request.args:
        telescopes_str = request.args.get('telescopes').split(',')
        sql_cmd += " AND project IN ({})".format(",".join(["%s"] * len(telescopes_str)))
        sql_args.extend(telescopes_str)

    if 'file-types' in request.args:
        ftypes_str = request.args.get('file-types').split(',')
        if 'fits' in ftypes_str:
            # data is synonym for fits
            ftypes_str.append('data')
        sql_cmd += " AND file_type IN ({})".format(",".join(["%s"] * len(ftypes_str)))
        sql_args.extend(ftypes_str)

    cen_coord, rad = None, -1.
    if 'pos-ra' in request.args and 'pos-dec' in request.args and 'pos-rad' in request.args:
        #TODO: Fix issue with telescopes and examine results
        # Make this work. (Can use small angle aproximation but be careful about going over the top not being accounted for)
        #Spy on simbad and steal their ideas
        #Talk to Danny Price, implement on parkes
        #Finding calibrator operations, 3C295 ect. pulsar,
        #Speed up database with indecies
        #Link the api documentation
        ra = float(request.args.get('pos-ra'))
        decl = float(request.args.get('pos-dec'))
        rad = float(request.args.get('pos-rad'))
        # try to limit the range of queried ra, decl based on the required position/radius
        decl_min, decl_max = max(decl - rad, -90.), min(decl + rad, 90.)
        from math import cos
        ra_per_dec = abs(cos(decl))
        ra_min, ra_max = ra - ra_per_dec * rad, ra + ra_per_dec * rad
        sql_cmd += " AND decl BETWEEN %s AND %s"
        print(sql_cmd)
        sql_args.extend([decl_min, decl_max])
        if ra_max - ra_min >= 360.:
            pass # can't filter
        elif ra_max > 360. or ra_min < 0:
            ra_min = (ra_min + 360.) % 360.
            ra_max = (ra_max + 360.) % 360.
            if ra_min < ra_max:
                sql_cmd += " AND ra NOT BETWEEN %s AND %s"
                sql_args.extend([ra_min, ra_max])
        else:
            sql_cmd += " AND ra BETWEEN %s AND %s"
            sql_args.extend([ra_min, ra_max])
        cen_coord = SkyCoord(ra = ra * u.deg, dec = decl * u.deg)

    if 'time-start' in request.args:
        t_start = Time(float(request.args.get('time-start')), format='mjd')
        sql_cmd +=  " AND utc_observed >= %s"
        sql_args.append(str(t_start.utc.iso))

    if 'time-end' in request.args:
        t_end = Time(float(request.args.get('time-end')), format='mjd')
        sql_cmd +=  " AND utc_observed <= %s"
        sql_args.append(str(t_end.utc.iso))

    if 'freq-start' in request.args:
        f_start = float(request.args.get('freq-start'))
        sql_cmd +=  " AND center_freq >= %s"
        sql_args.append(f_start)

    if 'freq-end' in request.args:
        f_end = float(request.args.get('freq-end'))
        sql_cmd +=  " AND center_freq <= %s"
        sql_args.append(f_end)

    if 'limit' in request.args:
        lim = int(request.args.get('limit'))
        sql_cmd +=  " LIMIT %s"
        sql_args.append(lim)

    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd, sql_args)
    table = cursor.fetchall()
    conn.close()

    data = []
    for row in table:
        entry = {}
        entry['id'] = row[0] #may be needed
        entry['target'] = row[3]
        entry['telescope'] = row[1]
        entry['utc'] = row[2]
        entry['mjd'] = Time(str(row[2]), format='iso').mjd
        entry['ra'] = row[4]
        entry['decl'] = row[5]
        entry['center_freq'] = row[6]
        entry['file_type'] = row[7]
        entry['size'] = row[8]
        entry['md5sum'] = row[9]
        entry['url'] = row[10]
        entry['cadence_url'] = row[11]
        if cen_coord is not None:
            coord = SkyCoord(ra = entry['ra'] * u.deg, dec = entry['decl'] * u.deg)
            #print(coord, file=sys.stderr)
            if cen_coord.separation(coord) > rad * u.deg:
                # out of position query range
                continue
        data.append(entry)
#Gavin #//TODO: Fix this for non hd5 data
    if 'grades' in request.args:
        grade = request.args.get('grades').split(' ')
        for g in grade:
            if g not in grades:
                return jsonify({'result':'failure','message':'Invalid grade type must be one of "fine","mid","time"'})
        new_data = []
        for entry in data:
                usefulPortion = entry['url'].split("/")[-1].split("_")
                g = usefulPortion[-1].split('.')[0]
                fileType = entry['file_type'].lower()
                if fileType != 'hdf5' and fileType != 'filterbank':
                    new_data.append(entry)
                else:
                    if fileType == 'filterbank':
                        g = fil_grades[g]
                    if g in grade:
                        new_data.append(entry)
        data = new_data


    if 'cadence' in request.args:
        if request.args.get('cadence')=='True':
            new_data  = []
            cadences = []
            for entry in data:
                ##print(entry['url'])
                cadence_url = entry['cadence_url']
                #orig_print(cadence_url)
                try:
                    if cadence_url==None:
                        cadence_url =getCadence(entry['id'])
                        #orig_print(cadence_url)
                        if cadence_url ==None:
                            #orig_print(entry['id'])
                            result = requests.get(openDataAPI+'get-cadence-url',params = {'url':entry['url']})
                            ##print(result)
                            cadence_url = result.json()['url']
                        ##Update mySQL table possibly
                    if cadence_url != "Unknown":
                        cadence_url = openDataAPI + "get-cadence/"+cadence_url
                        split_url = cadence_url.split('-')
                        #orig_print(split_url)
                        if 'telescopes' in request.args:
                            split_url[2] = split_url[2]+'telescopes:' + request.args.get('telescope') + ";"
                        if 'file-types' in request.args:
                            split_url[2] = split_url[2]+'fileTypes:' + request.args.get('file-types') + ";"
                        if 'grades' in request.args:
                            split_url[2] = split_url[2] +'grades:' + request.args.get('grades')
                        cadence_url = "-".join(split_url)
                except:
                    cadence_url = 'Unknown'
                    # sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
                    # conn = mysql.connect()
                    # cursor = conn.cursor()
                    # cursor.execute(sql_cmd,[entry['id']])
                    # conn.accept()
                    # cursor.close()
                    # conn.close()

                entry['cadence_url']=cadence_url
                #if cadence_url == 'Unknown' or cadence_url not in cadences:
                if cadence_url not in cadences and cadence_url != 'Unknown':
                    #entry.pop('id')
                    new_data.append(entry)
                    cadences.append(cadence_url)
            return jsonify({'result': 'success', 'data': new_data})
    #[entry.pop('id') for entry in data] #removing id from final json
    #print("Query ended")
    return jsonify({'result': 'success', 'data': data})

#Gavins Additions


def getCadence(id):
    sql_cmd = "select cadence from files where id = %s"
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd, [id])
    cadence = cursor.fetchall()
    conn.close()
    return cadence[0][0]


@bp.route('/api/get-cadence-url', methods=('GET', 'POST'))
def get_cadence_url():
    """
    A new addition. This method takes in a single argument 'url' which is the url location of a file in the open database. This method will then use the url to search the SQL database and attempt to find a cadence associated with the
    file in the url. Once the cadence is found, it will create a unique url identifying the cadence, which can be used to recover all the data of that cadence using the get-cadence method below.
    returns: dictionary d with d["result"] in {"success", "error"}
                               d["message"] set to message on result "error"
                               d["url"] set to query result set on result "success"
                                is a cadence url as described above.
    """
    #print("Get URL request Began")

    if 'url' not in request.args:
        return jsonify({'result': 'error', 'message': 'url is required'})

    url  = request.args.get('url')
    #print(url)
    usefulPortion = url.split("/")[-1].split("_")
    fileType  = usefulPortion[-1].split('.')[-1]
    days = 0
    seconds = 0
    grade = None
    if fileType == 'fits':
        return jsonify({'result': 'error','url':'Unknown'})#Todo make this more elegant
    elif fileType == 'raw':
        days = float(usefulPortion[2])
    elif fileType == 'fil':
        days = float(usefulPortion[3])
        seconds = float(usefulPortion[4])
    else:
        days = float(usefulPortion[1])
        seconds = float(usefulPortion[2])
        #grade = usefulPortion[-1].split('.')[0]


    sql_cmd = 'SELECT * FROM files WHERE '
    sql_args = []

    t_start = Time(days, format='mjd')
    #print(t_start.utc.iso)
    sql_cmd +=  " utc_observed >= %s"
    sql_args.append(str(t_start.utc.iso))

    t_end = Time(days+1, format='mjd')
    sql_cmd +=  " AND utc_observed <= %s"
    sql_args.append(str(t_end.utc.iso))

    #TODO: Make this work for non GBT data
    sql_cmd += " And project = GBT"

    sql_cmd += "ORDER BY utc_observed"
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
    #print(len(data))
    if grade:
        data = list(filter(lambda x: x['url'].split('/')[-1].split("_")[-1].split('.')[0] == grade,data))

    index = [ x['url'] for x in data].index(url)
    if index <0:
        sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
        #print(sql_cmd,[id])
        conn = mysql.connect()
        cursor = conn.cursor()
        cursor.execute(sql_cmd,[id])
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'result':'success','url':'Unknown'})
    if data[index]['cadence-url'] != None:
        if data[index]['cadence-url']=="Unknown":
            return jsonify({'result': 'success','url':'Unknown'})
        return jsonify({'result': 'success','url':openDataAPI + "get-cadence/"+data[index]['cadence-url']})
    targets, indices = getTargets(data)
    id = data[index]['id']
    #data = data[max(index-5,0):min(index+6,len(data)-1)]
    index = indices[index]
    start = max(index-5,0)
    stop = min(index+6,len(data)-1)
    index = -1
    targetSet = targets[start:stop]
    for i in range(0,len(targetSet)-5):
        #print(i,targetSet)
        if isCadence(i,targetSet):
            #print(i)
            index=start+i
            len=6
            break
    if index<0:
        for i in range(max(0,len(targetSet)-5)):
            if target in targetSet[i:i+4] and isPartialCadence(i,targetSet):
                index=start+i
                len=4
                break
        if index<0:
            sql_cmd = "Update files Set cadence = 'Unknown' Where id = %s;"
            #print(sql_cmd,[id])
            conn = mysql.connect()
            cursor = conn.cursor()
            cursor.execute(sql_cmd,[id])
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'result':'success','url':'Unknown'})
    index = indices.index(index)
    num = indices.index(min(len(targets)-1,indices[index]+len))-index
    cadenceUrl = str(num) +'--' + data[index]['url'].split("/")[-1]
    get_cadence(cadenceUrl) #Should update the mysql table
    #print(cadenceUrl)
    #print("Get URL request ended")
    return jsonify({'result': 'success','url':openDataAPI + "get-cadence/"+ cadenceUrl})




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


















@bp.route('/api/get-cadence/<string:cadence_url>', methods=(['GET']))
def get_cadence(cadence_url):
    """
    A new addition. When a cadence url (as generated by the get-cadence-url method above) is used, this method will return the 6 object cadence associated with that url and file type (mid, fine, or time). The cadence (assuming it exists)
    will be of the form ABACAD, and will given in the form of a json with 2 entries, 'result' and 'data'.
    returns: dictionary d with d["result"] in {"success", "error"}
                               d["data"] set to query result set on result "success"
                                         is a list of dictionaries, each with keys
                                         ['target', 'telescope', 'utc', 'mjd', 'ra',
                                          'decl', 'center_freq', 'file_type', 'size', 'md5sum', 'url']
    """

    usefulPortion = cadence_url.split("/")[-1].split('_')
    size = int(cadence_url.split("/")[-1].split('-')[0])
    filters = cadence_url.split("/")[-1].split('-')[1].split(";")
    days = float(usefulPortion[1])
    seconds = float(usefulPortion[2])
    time = days + seconds / 10**len(usefulPortion[2])
    grade,fileType = usefulPortion[-1].split('.')

    sql_cmd = 'SELECT * FROM files WHERE '
    sql_args = []

    t_start = Time(time, format='mjd')
    sql_cmd +=  " utc_observed >= %s"
    sql_args.append(str(t_start.utc.iso))

    t_end = Time(time+.2, format='mjd')
    sql_cmd +=  " AND utc_observed <= %s"
    sql_args.append(str(t_end.utc.iso))
    sql_cmd += "ORDER BY utc_observed" #..........

    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute(sql_cmd, sql_args)
    table = cursor.fetchall()
    conn.close()

    data = []
    for row in table:
        entry = {}
        entry['id'] = row[0] ##may be removed later
        entry['target'] = row[3]
        entry['telescope'] = row[1]
        entry['utc'] = row[2]
        entry['mjd'] = Time(str(row[2]), format='iso').mjd
        entry['ra'] = row[4]
        entry['decl'] = row[5]
        entry['center_freq'] = row[6]
        entry['file_type'] = row[7]
        entry['size'] = row[8]
        entry['md5sum'] = row[9]
        entry['url'] = row[10]
        data.append(entry)
    #print(len(data))
    ##data = [x for x in data if x['url'].split("/")[-1].split("_")[-1].split('.')[0] == grade]
    index = [x['url'].split("/")[-1] for x in data].index(cadence_url.split("/")[-1].split("-")[-1])
    cadence = data[index:index+size]
    for entry in cadence:
        sql_cmd = "Update files Set cadence = %s Where id = %s;"
        id = entry['id']
        #orig_print(id)
        conn = mysql.connect()
        cursor = conn.cursor()
        cursor.execute(sql_cmd,[cadence_url.split("/")[-1],id])
        conn.commit()
        cursor.close()
        conn.close()

    filterDict = {}
    if filters[0]:
        for filter in filters:
            if filter:
                filterDict[filter.split(':')[0]] = filter.split(':')[1]
    newCadence = []
    for entry in cadence:
        allowed = True
        fileType =entry['file_type'].lower()
        if 'telescopes' in filterDict.keys():
            if entry['telescope'] not in filterDict['telescope'].split(','):
                allowed=False
        if 'fileTypes' in filterDict.keys():
            if fileType not in filterDict['fileTypes'].split(','):
                allowed = False
        if 'grades' in filterDict.keys():
            if fileType == 'hdf5'or fileType == 'filterbank':
                grade= entry['url'].split('.')[-2].split('_')[-1]
                if fileType == 'filterbank':
                    grade = fil_grades(grade)
                if grade not in filterDict['grades'].split(' '):
                    allowed = False
        if allowed:
            newCadence.append(entry)

    return jsonify({'result':'success','data':newCadence})
