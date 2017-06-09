import db from './db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {r} from 'rethinkdb-websocket-server';

class AuthManager {

	constructor(options = {}, rConn){
		this.db = db
		this.options = options
		this.rConn = rConn
	}

	_run = (query) => {
	    return this.rConn.then(c => query.run(c));
	}

	_parsePassword = (password) => {
	    return password.replace('$2y$', '$2a$');
	}

	_genAuthToken() {
	    return Promise.resolve(crypto.randomBytes(this.options.authTokenBytes)).then(buf => {
	      return buf.toString('base64');
	    });
	  }

	checkAccount = (username, password) => {
		return this.db('users')
				.where({
					username
				})
				.first('password')
				.then(response => {
					const newPassword = this._parsePassword(response.password);

					return {
						isValid: bcrypt.compareSync(password, newPassword),
						password: bcrypt.hashSync(password, this.options.bcryptRounds)
					}
				})
	}

	signup = (username, password) => {
		return Promise.all(
				 
				[
				//check to edb
				this.getUser(username),
				//check to mysql
				this.checkAccount(username, password)
				]
			)
		
			.then(response => {

				if(response[0].length > 0){
					return {
						status: 302,
						errors: 'User already Exist'
					}
				}

				if(response[1].isValid){

					return this._genAuthToken().then(chat_token => {

						//insert to rdb
						return this._run(
							r.table('users').insert({
								username,
								chat_token,
								password: response[1].password
							}))
							.then(res => {

			                	return {
									status: 200,
									data : {
										username, 
										chat_token
									}
								}
			            	})
			            	.catch(e => {
			            		return Promise.reject(e)
			            	})
					})
				}

				return {
					status: 404,
					errors: 'Invalid Credentials'
				}
			})
	}

	getUser = (username) => {
		return this._run(
				r.table('users')
					.filter({username})
			)
			.then(cursor => {
				return cursor.toArray()
			})
	}

	getUserByUsernameAndChatToken = (username, chat_token) => {
		return this._run(
				r.table('users')
					.filter({username, chat_token})
			)
			.then(cursor => {
				return cursor.toArray()
			})
	}

	signin = (username, password) => {

		return this.getUser(username)
			.then(data => {

				if(data.length === 0){
					return {
						status: 404,
						errors: 'Invalid Credentials'
					}
				}

				const { username, chat_token } = data[0]

				if(!bcrypt.compareSync(password, data[0].password)){
					return {
						status: 404,
						errors: 'Invalid Credentials'
					}
				}

				return {
					status: 200,
					data : {
						user_id: data[0].user_id,
						username, 
						chat_token
					}
				}
			})
		 
	}

	chatToken = (username, chat_token) => {
	    return this.getUserByUsernameAndChatToken(username, chat_token)
	    	.then(data => {
	    		if(data.length === 0){
	    			return false
	    		}

	    		return true
	    	})
	 }
}

export default AuthManager