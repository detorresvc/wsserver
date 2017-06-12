import cfg from './config';
import { r, RP } from 'rethinkdb-websocket-server';

const d = new Date()

export const queryWhitelist = [

  r.table('messages')
    .changes()
    .opt("db", r.db(cfg.dbName)),

  r.table('messages')
    .orderBy(r.desc('created_at'))
    .slice(RP.check(x => typeof x === 'number'), RP.check(x => typeof x === 'number'))
    .orderBy(r.asc('created_at'))
    .opt("db", r.db(cfg.dbName)),

  r.table('messages')
    .insert({
        message: RP.ref("message"),
        name: RP.ref("name"),
        user_id: RP.ref("user_id"),
        created_at: r.now().inTimezone('+08:00')
    })
    .opt("db", r.db(cfg.dbName))
    .validate((refs, session) => {
        return refs.name === session.username
    })
];
