#!/bin/bash
echo "Removing pm2 logs and databases" > logrm.log

pm2 stop all

rm /root/.pm2/logs/app-out.log




#id=$(cat /home/kali/intconfig |grep -oP "id=\K.*")
#
#ruta="*DatosBLE_"$id".db"
#aux=$(ls $ruta)

rm /home/kali/UPCT_TerabeePC/databases/*

pm2 start all

timedatectl |grep "Local time" >> logrm.log