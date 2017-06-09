import knex from 'knex';
import { mysql } from './config';

const db = knex({
	client: 'mysql',
	connection: {
	    host : mysql.host,
	    user : mysql.user,
	    password : mysql.password,
	    database : mysql.database
	 }
})

export default db

