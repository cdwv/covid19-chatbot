FROM node:10
RUN npm install -g nodemon
EXPOSE 3000
CMD bash -c 'cd /usr/src/app && nodemon'
