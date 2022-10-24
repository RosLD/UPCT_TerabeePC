#!/bin/bash
echo "Removing pm2 logs and databases" > logrm.log

pm2 stop all

rm /root/.pm2/logs/app-out.log


cd /home/kali/UPCT_TerabeePC/

rm *.db

pm2 start all

timedatectl |grep "Local time" >> logrm.log