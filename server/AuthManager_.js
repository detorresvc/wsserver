import bcrypt from 'bcrypt';
import cfg from './config';
import crypto from 'crypto';
import Promise from 'promise';
import {r} from 'rethinkdb-websocket-server';

export class AuthManager {
  
  constructor(dbConnPromise) {
    this.dbConnPromise = dbConnPromise;
  }

  _run(query) {
    return this.dbConnPromise.then(c => query.run(c));
  }

  _hashPassword(password) {
    return Promise.resolve(bcrypt.hash(password, cfg.bcryptRounds));
  }

  _comparePassword(password, hashedPassword) {
    return Promise.resolve(bcrypt.compare(password, hashedPassword));
  }

  _genAuthToken() {
    return Promise.resolve(crypto.randomBytes(cfg.authTokenBytes)).then(buf => {
      return buf.toString('base64');
    });
  }

    // Create a user in the database with the specified userId and password, and
    // return a promise that resolves to the user object. The promise will be
    // rejected if there are any errors, such as duplicate userId.
    signup(user_id, username) {
        
        return this._genAuthToken().then(auth_token => {
            return {user_id, username, auth_token};
        })
        .then(user => {
            return this._run(r.table('users').insert(user)).then(result => {
                if (result.errors) {
                    return Promise.reject(result.first_error);
                }
                return user;
            });
        });
    }

  // Attempt to login with the specified userId and password, and return a
  // promise that resolves to the user object if successful. The promise will
  // be rejected if the authentication was unsuccessful.
  login(userId, password) {
    return this._run(r.table('users').get(userId)).then(user => {
      if (!user) {
        return Promise.reject('Non-existent user');
      }
      return this._comparePassword(password, user.hashedPassword).then(matches => {
        return matches ? matches : Promise.reject('Incorrect password');
      });
    });
  }

  // Check to see if there is an existing user with the specified userId and
  // authToken. Return a promise that resolves to true if so, otherwise the
  // returned promise will be rejected.
  tokenAuth(user_id, auth_token) {
    const query = r.table('users').filter({auth_token: auth_token})
    return this._run(query).then(success => {
      return success ? true : Promise.reject('Authentication failure');
    });
  }
}
