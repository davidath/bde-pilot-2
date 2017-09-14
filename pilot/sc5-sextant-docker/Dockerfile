FROM bde2020/sextant

ENV PORT 8080
ENV PORT2 5000


RUN apt-get update && \
    apt-get install -y git python-pip libpq-dev python-dev libhdf5-serial-dev netcdf-bin libnetcdf-dev gdal-bin libgdal-dev python-gdal libblas-dev liblapack-dev libatlas-base-dev gfortran libfreetype6-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir /pilot_data
RUN git clone http://github.com/davidath/bde-pilot-2.git
RUN apt-get remove -y python-setuptools
RUN wget https://bootstrap.pypa.io/get-pip.py
RUN python get-pip.py
RUN rm -rf /tomcat/webapps/Sextant_v2.0/
RUN cp -Rp /bde-pilot-2/pilot/SC5_Sextant_docker/Sextant_v2.0/ /tomcat/webapps/
RUN pip install -r /bde-pilot-2/pilot/requirements.txt
RUN pip install --upgrade https://github.com/Lasagne/Lasagne/archive/master.zip
RUN pip install --upgrade https://github.com/Theano/Theano/archive/master.zip

RUN chmod +x /*.sh

EXPOSE $PORT
EXPOSE $PORT2

CMD ["/bin/bash", "/sextant.sh"]
