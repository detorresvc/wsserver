import AuthManager from './AuthManager';
import cfg from './config';
import https from 'https';
import express from 'express';
import {r, listen as wsListen} from 'rethinkdb-websocket-server';
import { queryWhitelist } from './queries';
import cors from 'cors';
import  bodyParser from 'body-parser';
import fs from 'fs';

const ssl_opt = {
    ca: fs.readFileSync(cfg.certificate.ca, 'utf8'),
    key: fs.readFileSync(cfg.certificate.key, 'utf8'),
    cert: fs.readFileSync(cfg.certificate.cert, 'utf8') 
}

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

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())
app.use('/', express.static('assets'));

app.post('/signup', (req, res) => {
    return auth.signup(req.body.username, req.body.password, req.body.confirm_password)
    	.then(response => {
    		res.send(response)
    	})
});

app.post('/signin', (req, res) => {
    return auth.signin(req.body.username, req.body.password)
      .then(response => {
        res.send(response)
      })
});

const httpServer = https.createServer(ssl_opt, app);

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


