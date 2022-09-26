#!/bin/bash

#Raspberry conf
eth=192.168.0.180
ipint=192.168.102.125
hostname=Raspberry8


echo "Connecting to Wifi IoTUT"

echo "Deactivating NetworkManager"

#Activate interfaces
ifconfig eth0 up
ifconfig wlan0 up

pm2 save

#Connect to wireless network
wpa_supplicant -B -i wlan0 -c<(wpa_passphrase "IoTUT" "vp:tppsd44")


#Forwarding table
ip address add $eth/24 dev eth0
ip address add $ipint/24 dev wlan0
ip route add default via 192.168.102.254 dev

#DNS
sh -c "echo nameserver 212.128.20.252 >> /etc/resolv.conf"
sh -c "echo nameserver 212.128.20.9 >> /etc/resolv.conf"

echo "Interfaces ready!"

#Hostname
old_host=$(cat /etc/hostname)
echo $hostname > /etc/hostname

if [[ $old_host != $hostname ]]
then
        echo "127.0.1.1 "$hostname >>/etc/hosts
        echo "New hostname assigned"
fi

#NTP
echo "Establishing timezone"
timedatectl set-timezone "Europe/Madrid"

pm2 start app.js
pm2 start appBLE.js