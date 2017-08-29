import psycopg2
import json
import base64

class DBConn(object):

    instance = None
    engine = None

    def __init__(self):
        with open('db_info.json', 'r') as data_file:
            dbpar = json.load(data_file)
        conn = psycopg2.connect("dbname='" + dbpar['dbname'] + "' user='" + dbpar['user'] +
                                "' host='" + dbpar['host'] + "' port='" + dbpar['port'] + "'password='" + base64.b64decode(dbpar['pass']) + "' sslmode=disable")
        cur = conn.cursor()
        self.engine = cur
        instance = cur

    def __new__(cls):
        if DBConn.instance is None:
            DBConn.instance = object.__new__(cls)
        return DBConn.instance
