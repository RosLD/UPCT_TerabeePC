#!/bin/bash
pm2 stop all

echo "Moving databases to folder" > /root/database_change.log

cd /home/kali/UPCT_TerabeePC
mkdir databases

mv *.db databases

echo "Done!"

timedatectl |grep "Local time" >> /root/database_change.log

