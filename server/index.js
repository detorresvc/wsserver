import AuthManager from './AuthManager';
import cfg from './config';
import http from 'http';
import express from 'express';
import {r, listen as wsListen} from 'rethinkdb-websocket-server';
import {queryWhitelist} from './queries';
import cors from 'cors';
import bodyParser from 'body-parser';
const jsonParser = bodyParser.json()


const rOpts = {host: cfg.dbHost, port: cfg.dbPort, db: cfg.dbName};
const rConn = Promise.resolve(r.connect(rOpts))


const auth = new AuthManager(cfg, rConn)

const sessionCreator = urlQueryParams => {
  const { username, token } = urlQueryParams;
  return auth.chatToken(username, token)
    .then(() => {
      return { username }
    })
};

const app = express();

app.use(cors())

app.use('/', express.static('assets'));

app.post('/signup',jsonParser, (req, res) => {
    return auth.signup(req.body.username, req.body.password)
    	.then(response => {
    		res.send(response)
    	})
});

app.post('/signin',jsonParser, (req, res) => {
    return auth.signin(req.body.username, req.body.password)
      .then(response => {
        res.send(response)
      })
});

const httpServer = http.createServer(app);

wsListen({
  	httpServer,
  	httpPath: cfg.httpPath,                      
  	dbHost: cfg.dbHost,
  	dbPort: cfg.dbPort,
  	unsafelyAllowAnyQuery: false,
    sessionCreator,
    queryWhitelist
});

// Start the HTTP server on the configured port
httpServer.listen(cfg.webPort);
console.log('Chat server started');


