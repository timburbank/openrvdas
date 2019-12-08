#!/bin/bash -e

# This script is designed to be run as root. It should take a clean CentOS 7
# installation and install and configure all the components to run the full
# OpenRVDAS system.

# Once this script has completed and the machine has been rebooted,
# you should be able to run "service openrvdas start" to have the
# system up and running. We don't want to make it start automatically
# by default, as it can eat away at both machine computation and
# bandwidth budgets.

# OpenRVDAS is available as open source under the MIT License at
#   https:/github.com/oceandatatools/openrvdas

# This script is VERY rudimentary and has not been extensively tested. If it
# fails on some part of the installation, there is no guarantee that fixing
# the specific issue and simply re-running will produce the desired result.
# Bug reports, and even better, bug fixes, will be greatly appreciated.

#DEFAULT_HOSTNAME=$HOSTNAME
DEFAULT_INSTALL_ROOT=/opt
#DEFAULT_HTTP_PROXY=proxy.lmg.usap.gov:3128 #$HTTP_PROXY
DEFAULT_HTTP_PROXY=$http_proxy

DEFAULT_OPENRVDAS_REPO=https://github.com/oceandatatools/openrvdas
DEFAULT_OPENRVDAS_BRANCH=master

DEFAULT_RVDAS_USER=`whoami`

if [ "$(whoami)" == "root" ]; then
  echo "ERROR: installation script must *not* be run as root."
  return -1 2> /dev/null || exit -1  # terminate correctly if sourced/bashed
fi

echo "############################################################################"
echo OpenRVDAS configuration script
#while true; do
#    read -p "Do you wish to continue? " yn
#    case $yn in
#        [Yy]* ) break;;
#        [Nn]* ) exit;;
#        * ) echo "Please answer yes or no.";;
#    esac
#done

#read -p "Name to assign to host ($DEFAULT_HOSTNAME)? " HOSTNAME
#HOSTNAME=${HOSTNAME:-$DEFAULT_HOSTNAME}
#echo "Hostname will be '$HOSTNAME'"

read -p "Install root? ($DEFAULT_INSTALL_ROOT) " INSTALL_ROOT
INSTALL_ROOT=${INSTALL_ROOT:-$DEFAULT_INSTALL_ROOT}
echo "Install root will be '$INSTALL_ROOT'"
echo
read -p "Repository to install from? ($DEFAULT_OPENRVDAS_REPO) " OPENRVDAS_REPO
OPENRVDAS_REPO=${OPENRVDAS_REPO:-$DEFAULT_OPENRVDAS_REPO}

read -p "Repository branch to install? ($DEFAULT_OPENRVDAS_BRANCH) " OPENRVDAS_BRANCH
OPENRVDAS_BRANCH=${OPENRVDAS_BRANCH:-$DEFAULT_OPENRVDAS_BRANCH}

read -p "HTTP/HTTPS proxy to use ($DEFAULT_HTTP_PROXY)? " HTTP_PROXY
HTTP_PROXY=${HTTP_PROXY:-$DEFAULT_HTTP_PROXY}

[ -z $HTTP_PROXY ] || echo Setting up proxy $HTTP_PROXY
[ -z $HTTP_PROXY ] || export http_proxy=$HTTP_PROXY
[ -z $HTTP_PROXY ] || export https_proxy=$HTTP_PROXY

echo Will install from github.com
echo "Repository: '$OPENRVDAS_REPO'"
echo "Branch: '$OPENRVDAS_BRANCH'"
echo

# Set up for pre-existing user; haven't quite figured out how to create
# new users properly on the command line
while true; do
  read -p "Existing user to set system up for? ($DEFAULT_RVDAS_USER) " RVDAS_USER
  RVDAS_USER=${RVDAS_USER:-$DEFAULT_RVDAS_USER}

  if id -u $RVDAS_USER > /dev/null; then
    break
  else
    echo User \"${RVDAS_USER}\" not found - try again?
  fi
done

## Create user if they don't exist yet
#read -p "OpenRVDAS user to create? ($DEFAULT_RVDAS_USER) " RVDAS_USER
#RVDAS_USER=${RVDAS_USER:-$DEFAULT_RVDAS_USER}
#echo Checking if user $RVDAS_USER exists yet
#if id -u $RVDAS_USER > /dev/null; then
#  echo User exists, skipping
#else
#  echo Creating $RVDAS_USER
#  adduser $RVDAS_USER
#  #passwd $RVDAS_USER
#  usermod -a -G tty $RVDAS_USER
#fi

# Get current and new passwords for database
echo
read -p "Database password to use for $RVDAS_USER? ($DEFAULT_RVDAS_DATABASE_PASSWORD) " RVDAS_DATABASE_PASSWORD
RVDAS_DATABASE_PASSWORD=${RVDAS_DATABASE_PASSWORD:-$DEFAULT_RVDAS_DATABASE_PASSWORD}
read -p "Current database password for root? (if one exists - hit return if not) " CURRENT_ROOT_DATABASE_PASSWORD
read -p "New database password for root? ($CURRENT_ROOT_DATABASE_PASSWORD) " NEW_ROOT_DATABASE_PASSWORD
NEW_ROOT_DATABASE_PASSWORD=${NEW_ROOT_DATABASE_PASSWORD:-$CURRENT_ROOT_DATABASE_PASSWORD}

echo
echo "############################################################################"
echo The OpenRVDAS server can be configured to start on boot. If you wish this
echo to happen, it will be run/monitored by the supervisord service using the
echo configuration file in /usr/local/etc/supervisor.d/openrvdas.ini.
echo
echo If you do not wish it to start automatically, it may still be run manually
echo from the command line or started via supervisor by running supervisorctl
echo and starting processes logger_manager and cached_data_server.
echo
while true; do
    read -p "Do you wish to start the OpenRVDAS server on boot? " yn
    case $yn in
        [Yy]* )
            START_OPENRVDAS_AS_SERVICE=True
            echo Will enable openrvdas server run on boot.
            break;;
        [Nn]* )
            break;;
        * ) echo "Please answer yes or no.";;
    esac
done

echo "############################################################################"
echo Beginning installation
# Set creation mask so that everything we install is, by default,
# world readable/executable.
umask 022

###### START OF SKIP
# Convenient way of commenting out stuff
if [ 0 -eq 1 ]; then
  Commented out stuff goes here
fi
###### END OF SKIP

# Create openrvdas log and tmp directories
echo Creating openrvdas working directories in /var/tmp
echo Please enter sudo password if prompted...
sudo mkdir -p /var/log/openrvdas /var/tmp/openrvdas
chown $RVDAS_USER /var/log/openrvdas /var/tmp/openrvdas

## Set hostname
#echo "############################################################################"
#echo Setting hostname...
#sudo hostname $HOSTNAME
#if grep -q "^127.0.0.1" /etc/hosts | grep $HOSTNAME ; then
#  echo Hostname already in /etc/hosts
#else
#  sudo echo "127.0.0.1    $HOSTNAME" >> /etc/hosts
#fi

# Install git:
echo Looking for/installing git
git --version  # prompts for installation of command line tools

# Install homebrew:
echo Checking for homebrew
[ -e /usr/local/bin/brew ] || echo Installing homebrew
[ -e /usr/local/bin/brew ] || ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Install system packages we need
echo Installing python and supporting packages
[ -e /usr/local/bin/python ] || brew install python
[ -e /usr/local/bin/socat ]  || brew install socat
[ -e /usr/local/bin/ssh ]    || brew install openssh
[ -e /usr/local/bin/mysql ]  || brew install mysql
[ -e /usr/local/bin/nginx ]  || brew install nginx
[ -e /usr/local/bin/uwsgi ]  || brew install uwsgi
[ -e /usr/local/bin/supervisorctl ] || brew install supervisor

brew upgrade python socat openssh mysql nginx uwsgi supervisor || echo Upgraded packages
brew link --overwrite python || echo Linking Python

echo Starting services mysql and supervisor
brew tap homebrew/services
brew services restart mysql
brew services restart supervisor

# Install database stuff and set up as service.
echo "#########################################################################"
echo Setting up MySQL database tables and permissions
# Verify current root password for mysql
while true; do
  # Check whether they're right about the current password; need
  # a special case if the password is empty.
  PASS=TRUE
  [ ! -z $CURRENT_ROOT_DATABASE_PASSWORD ] || (mysql -u root  < /dev/null) || PASS=FALSE
  [ -z $CURRENT_ROOT_DATABASE_PASSWORD ] || (mysql -u root -p$CURRENT_ROOT_DATABASE_PASSWORD < /dev/null) || PASS=FALSE
  case $PASS in
    TRUE ) break;;
    * ) echo "Database root password failed";read -p "Current database password for root? (if one exists - hit return if not) " CURRENT_ROOT_DATABASE_PASSWORD;;
  esac
done

# Set the new root password
cat > /tmp/set_pwd <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$NEW_ROOT_DATABASE_PASSWORD';
FLUSH PRIVILEGES;
EOF

# If there's a current root password
[ -z $CURRENT_ROOT_DATABASE_PASSWORD ] || mysql -u root -p$CURRENT_ROOT_DATABASE_PASSWORD < /tmp/set_pwd

# If there's no current root password
[ ! -z $CURRENT_ROOT_DATABASE_PASSWORD ] || mysql -u root < /tmp/set_pwd
rm -f /tmp/set_pwd

# Now do the rest of the 'mysql_safe_installation' stuff
mysql -u root -p$NEW_ROOT_DATABASE_PASSWORD <<EOF
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.db WHERE Db='test' OR Db='test_%';
FLUSH PRIVILEGES;
EOF

#echo EXITING!
#return -1 2> /dev/null || exit -1  # terminate correctly if sourced/bashed

echo "#########################################################################"
echo Setting up database users
mysql -u root -p$NEW_ROOT_DATABASE_PASSWORD <<EOF
drop user if exists 'test'@'localhost';
create user 'test'@'localhost' identified by 'test';

drop user if exists '$RVDAS_USER'@'localhost';
create user '$RVDAS_USER'@'localhost' identified by '$RVDAS_DATABASE_PASSWORD';

create database if not exists data character set utf8;
GRANT ALL PRIVILEGES ON data.* TO '$RVDAS_USER'@'localhost';

create database if not exists openrvdas character set utf8;
GRANT ALL PRIVILEGES ON openrvdas.* TO '$RVDAS_USER'@'localhost';

create database if not exists test character set utf8;
GRANT ALL PRIVILEGES ON test.* TO '$RVDAS_USER'@'localhost';
GRANT ALL PRIVILEGES ON test.* TO 'test'@'localhost' identified by 'test';

create database if not exists test_$RVDAS_USER character set utf8;
GRANT ALL PRIVILEGES ON test_$RVDAS_USER.* TO '$RVDAS_USER'@'localhost';
GRANT ALL PRIVILEGES ON test_$RVDAS_USER.* TO 'test'@'localhost' identified by 'test';

flush privileges;
\q
EOF
echo Done setting up database

# Django and uWSGI
echo "############################################################################"

echo Installing Django, uWSGI and other Python-dependent packages.
echo Please enter sudo password if prompted...
export PATH=/usr/bin:/usr/local/bin:$PATH
/usr/local/bin/pip3 install --upgrade pip &> /dev/null || echo Upgrading old pip if it\'s there

sudo /usr/local/bin/pip3 install Django==2.2 pyserial uwsgi websockets PyYAML \
       parse mysqlclient mysql-connector diskcache

# uWSGI configuration
#Following instructions in https://www.tecmint.com/create-new-service-units-in-systemd/
echo "#########################################################################"
echo Configuring uWSGI as service

# Set up nginx
echo "############################################################################"
echo Setting up NGINX
[ -e /usr/local/etc/nginx/sites-available ] || mkdir /usr/local/etc/nginx/sites-available
[ -e /usr/local/etc/nginx/sites-enabled ] || mkdir /usr/local/etc/nginx/sites-enabled

# We need to add a couple of lines to not quite the end of nginx.conf,
# so do a bit of hackery: chop off the closing "}" with head, append
# the lines we need and a new closing "}" into a temp file, then copy back.
if grep -q "/usr/local/etc/nginx/sites-enabled/" /usr/local/etc/nginx/nginx.conf; then
  echo NGINX sites-available already registered. Skipping...
else
  NGINX_CONF_LEN=`wc -l /usr/local/etc/nginx/nginx.conf | cut   -c1-8` 

  head -n $(($NGINX_CONF_LEN-1)) /usr/local/etc/nginx/nginx.conf > /tmp/nginx.conf
  cat >> /tmp/nginx.conf <<EOF
     include /usr/local/etc/nginx/sites-enabled/*.conf;
     server_names_hash_bucket_size 64;
}
EOF
  mv -f /tmp/nginx.conf /usr/local/etc/nginx/nginx.conf
  echo Done setting up NGINX
fi

# Set up openrvdas
echo "############################################################################"
echo Fetching and setting up OpenRVDAS code...
cd $INSTALL_ROOT

if [ ! -e openrvdas ]; then
  echo Making openrvdas directory.
  echo Please enter sudo password if prompted...
  sudo mkdir openrvdas
  sudo chown ${RVDAS_USER} openrvdas
fi    

if [ -e openrvdas/.git ] ; then   # If we've already got an installation
  cd openrvdas
  git checkout $OPENRVDAS_BRANCH
  git pull
else                              # If we don't already have and installation
  git clone -b $OPENRVDAS_BRANCH $OPENRVDAS_REPO
  cd openrvdas
fi

#cat > /etc/profile.d/openrvdas.sh <<EOF
#export PYTHONPATH=$PYTHONPATH:${INSTALL_ROOT}/openrvdas
#export PATH=$PATH:${INSTALL_ROOT}/openrvdas/logger/listener
#EOF

echo Initializing OpenRVDAS database...
cd ${INSTALL_ROOT}/openrvdas
cp django_gui/settings.py.dist django_gui/settings.py
sed -i -e "s/'USER': 'rvdas'/'USER': '${RVDAS_USER}'/g" django_gui/settings.py
sed -i -e "s/'PASSWORD': 'rvdas'/'PASSWORD': '${RVDAS_DATABASE_PASSWORD}'/g" django_gui/settings.py

cp database/settings.py.dist database/settings.py
sed -i -e "s/DEFAULT_DATABASE_USER = 'rvdas'/DEFAULT_DATABASE_USER = '${RVDAS_USER}'/g" database/settings.py
sed -i -e "s/DEFAULT_DATABASE_PASSWORD = 'rvdas'/DEFAULT_DATABASE_PASSWORD = '${RVDAS_DATABASE_PASSWORD}'/g" database/settings.py

cp display/js/widgets/settings.js.dist \
   display/js/widgets/settings.js
sed -i -e "s/localhost/${HOSTNAME}/g" display/js/widgets/settings.js

python3 manage.py makemigrations django_gui
python3 manage.py migrate
python3 manage.py collectstatic --no-input --clear --link
chmod -R og+rX static

# A temporary hack to allow the display/ pages to be accessed by Django
# in their old location of static/widgets/
cd static;ln -s html widgets;cd ..

# Bass-ackwards way of creating superuser $RVDAS_USER, as the createsuperuser
# command won't work from a script
echo "from django.contrib.auth.models import User; User.objects.filter(email='${RVDAS_USER}@example.com').delete(); User.objects.create_superuser('${RVDAS_USER}', '${RVDAS_USER}@example.com', '${RVDAS_DATABASE_PASSWORD}')" | python3 manage.py shell

# Connect uWSGI with our project installation
echo "############################################################################"
echo Creating OpenRVDAS-specific uWSGI files
cp /usr/local/etc/nginx/uwsgi_params $INSTALL_ROOT/openrvdas/django_gui

cat > $INSTALL_ROOT/openrvdas/django_gui/openrvdas_nginx.conf<<EOF
# openrvdas_nginx.conf

# the upstream component nginx needs to connect to
upstream django {
    server unix://${INSTALL_ROOT}/openrvdas/django_gui/openrvdas.sock; # for a file socket
}

# configuration of the server
server {
    # the port your site will be served on
    listen      8000;
    # the domain name it will serve for
    server_name ${HOSTNAME}; # substitute machine's IP address or FQDN
    charset     utf-8;

    # max upload size
    client_max_body_size 75M;   # adjust to taste

    # Django media
    location /media  {
        alias ${INSTALL_ROOT}/openrvdas/media;  # project media files
    }

    location /display {
        alias ${INSTALL_ROOT}/openrvdas/display/html; # display pages
        autoindex on;
    }
    location /js {
        alias /opt/openrvdas/display/js; # display pages
    }
    location /css {
        alias /opt/openrvdas/display/css; # display pages
    }

    location /static {
        alias ${INSTALL_ROOT}/openrvdas/static; # project static files
        autoindex on;
    }

    location /docs {
        alias ${INSTALL_ROOT}/openrvdas/docs; # project doc files
        autoindex on;
    }

    # Finally, send all non-media requests to the Django server.
    location / {
        uwsgi_pass  django;
        include     ${INSTALL_ROOT}/openrvdas/django_gui/uwsgi_params;
    }
}
EOF

# Make symlink to nginx dir
ln -sf ${INSTALL_ROOT}/openrvdas/django_gui/openrvdas_nginx.conf /usr/local/etc/nginx/sites-enabled

cat > ${INSTALL_ROOT}/openrvdas/django_gui/openrvdas_uwsgi.ini <<EOF
# openrvdas_uwsgi.ini file
[uwsgi]

# Django-related settings
# the base directory (full path)
chdir           = ${INSTALL_ROOT}/openrvdas
# Django's wsgi file
module          = django_gui.wsgi
# the base directory from which bin/python is available
# Do an ln -s bin/python3 bin/python in this dir!!!
home            = /usr/local

# process-related settings
# master
master          = true
# maximum number of worker processes
processes       = 10
# the socket (use the full path to be safe
socket          = ${INSTALL_ROOT}/openrvdas/django_gui/openrvdas.sock
# ... with appropriate permissions - may be needed
# chmod-socket    = 664
chmod-socket    = 666
# clear environment on exit
vacuum          = true
EOF

# Make vassal directory and copy symlink in
[ -e /usr/local/etc/uwsgi/vassals ] || mkdir -p /usr/local/etc/uwsgi/vassals
ln -sf ${INSTALL_ROOT}/openrvdas/django_gui/openrvdas_uwsgi.ini \
   /usr/local/etc/uwsgi/vassals/

# Make everything accessible to nginx
chmod 755 ${INSTALL_ROOT}/openrvdas
chown -R ${RVDAS_USER} ${INSTALL_ROOT}/openrvdas
chgrp -R `id -n -g ${RVDAS_USER}` ${INSTALL_ROOT}/openrvdas

# Make uWSGI run on boot
brew services restart uwsgi

# Make nginx run on boot:
brew services restart nginx

echo "############################################################################"
echo Setting up openrvdas service with supervisord
if [ -z $START_OPENRVDAS_AS_SERVICE ]; then
    echo Openrvdas will *not* start on boot. To start it, run supervisorctl
    echo and start processes logger_manager and cached_data_server.
    SUPERVISOR_AUTOSTART=false
else
    echo Openrvdas will start on boot
    SUPERVISOR_AUTOSTART=true
fi

echo Copying supervisor file openrvdas.ini into place.
cat > /tmp/openrvdas.ini <<EOF
[inet_http_server]
port=*:8001
username=${RVDAS_USER}
password=${RVDAS_USER}

[program:cached_data_server]
command=/usr/local/bin/python3 server/cached_data_server.py --port 8766 --disk_cache /var/tmp/openrvdas/disk_cache --max_records 8640 -v
directory=${INSTALL_ROOT}/openrvdas
autostart=$SUPERVISOR_AUTOSTART
autorestart=true
startretries=3
stderr_logfile=/var/log/openrvdas/cached_data_server.err.log
stdout_logfile=/var/log/openrvdas/cached_data_server.out.log
user=$RVDAS_USER

[program:logger_manager]
command=/usr/local/bin/python3 server/logger_manager.py --database django --no-console --data_server_websocket :8766 -v
directory=${INSTALL_ROOT}/openrvdas
autostart=$SUPERVISOR_AUTOSTART
autorestart=true
startretries=3
stderr_logfile=/var/log/openrvdas/logger_manager.err.log
stdout_logfile=/var/log/openrvdas/logger_manager.out.log
user=$RVDAS_USER

[program:simulate_nbp]
command=/usr/local/bin/python3 logger/utils/simulate_data.py --config test/NBP1406/simulate_NBP1406.yaml
directory=${INSTALL_ROOT}/openrvdas
autostart=false
autorestart=true
startretries=3
stderr_logfile=/var/log/openrvdas/simulate_nbp.err.log
stdout_logfile=/var/log/openrvdas/simulate_nbp.out.log
user=$RVDAS_USER

[program:simulate_skq]
command=/usr/local/bin/python3 logger/utils/simulate_data.py --config test/SKQ201822S/simulate_SKQ201822S.yaml
directory=${INSTALL_ROOT}/openrvdas
autostart=false
autorestart=true
startretries=3
stderr_logfile=/var/log/openrvdas/simulate_skq.err.log
stdout_logfile=/var/log/openrvdas/simulate_skq.out.log
user=$RVDAS_USER
EOF
echo Please enter sudo password if prompted...
sudo cp /tmp/openrvdas.ini /usr/local/etc/supervisor.d/openrvdas.ini

#echo "############################################################################"
#while true; do
#    read -p "Do you wish to install Redis? " yn
#    case $yn in
#        [Yy]* )
#            apt-get install -y redis-server;
#            pip3 install redis;
#
#            while true; do
#                read -p "Do you wish to start a Redis server on boot? " ynb
#                case $ynb in
#                    [Yy]* )
#                        systemctl start redis
#                        #systemctl enable redis.service;
#                        break;;
#                    [Nn]* )
#                        break;;
#                    * ) echo "Please answer yes or no.";;
#                esac
#            done
#            break;;
#        [Nn]* )
#            break;;
#        * ) echo "Please answer yes or no.";;
#    esac
#done

echo "#########################################################################"
echo Restarting services: nginx, uwsgi, supervisor.
brew services restart nginx uwsgi supervisor
echo "#########################################################################"
echo Installation complete - happy logging!
echo
