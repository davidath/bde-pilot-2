#!/bin/bash
cp /bde-pilot-2/pilot/data_ingest/db_info.json .
cd /bde-pilot-2/pilot/detection_listener/sc5_backend/
rm -f *.zip
killall -9 redis-server
killall -9 celery
killall -9 gunicorn
./run-redis.sh &
celery worker -A listener.celery -f celery_log.txt --loglevel=info &
gunicorn -b 0.0.0.0:5000 -w 2 -t 500 listener:app --log-level debug --log-file gunicorn_log.txt &