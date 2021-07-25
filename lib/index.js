const { RpcWorker, RpcProvider } = require('@persona/infra/service-broker')

const { MongoClient, ObjectId } = require('mongodb')
const admin = require('firebase-admin')
const Parameter = require('parameter')
const dot = require('mongo-dot-notation')

const {
  MONGO_CONNECTION_STRING,
  MONGO_DB,
  PASSWORD_COLLECTION,
  GOOGLE_APPLICATION_CREDENTIALS
} = require('./config')

const RULES = {
  name: {
    type: 'string'
  },
  uri: {
    type: 'string',
    format: /^(?<scheme>[a-z][a-z0-9+.-]+):(?<authority>\/\/(?<user>[^@]+@)?(?<host>[a-z0-9.\-_~]+)(?<port>:\d+)?)?(?<path>(?:[a-z0-9-._~]|%[a-f0-9]|[!$&'()*+,;=:@])+(?:\/(?:[a-z0-9-._~]|%[a-f0-9]|[!$&'()*+,;=:@])*)*|(?:\/(?:[a-z0-9-._~]|%[a-f0-9]|[!$&'()*+,;=:@])+)*)?(?<query>\?(?:[a-z0-9-._~]|%[a-f0-9]|[!$&'()*+,;=:@]|[/?])+)?(?<fragment>#(?:[a-z0-9-._~]|%[a-f0-9]|[!$&'()*+,;=:@]|[/?])+)?$/i
  },
  username: {
    type: 'string'
  },
  password: {
    type: 'string'
  }
}

function validate (document) {
  const rules = {}
  const data = {}
  for (const key of Object.keys(document)) {
    rules[key] = RULES[key]
    data[key] = document[key]
  }

  const validator = new Parameter()
  const errors = validator.validate(rules, data)
  if (errors) {
    throw new Error(errors[0].field + ' ' + errors[0].message)
  }
}

let passwords

module.exports = new RpcWorker('passwords', class extends RpcProvider {
  async [RpcProvider.init] () {
    const client = new MongoClient(MONGO_CONNECTION_STRING)
    await client.connect()
    passwords = client.db(MONGO_DB).collection(PASSWORD_COLLECTION)

    admin.initializeApp({
      credential: admin.credential.cert(require(GOOGLE_APPLICATION_CREDENTIALS))
    })
  }

  async [RpcProvider.before] () {
    if (this.context.type === 'system') {
      return
    }

    if (!this.context.authorization) {
      console.log('User not logged in')
    }

    this.user = await admin.auth().verifyIdToken(this.context.authorization.substring('Bearer '.length))
  }

  /**
   * creates a new credential object
   *
   * @param personaId the persona to associate with
   * @param credential full credential object ('_id' and 'personaId' are ignored)
   */
  async create (personaId, credential) {
    credential = credential || {}

    await this.services.personas.show(personaId)

    const { name, uri, username, password } = credential
    const payload = { name, uri, username, password }

    validate(payload)

    payload.personaId = personaId

    const { insertedId } = await passwords.insertOne(payload)

    return {
      _id: insertedId,
      ...payload
    }
  }

  /**
   * list all credentials associated with a specific persona
   *
   * @param personaId
   * @return {Promise<[?]>}
   */
  async list (personaId) {
    await this.services.personas.show(personaId)

    return await passwords.find({ personaId }).toArray()
  }

  /**
   * returns the credential with requested id if current logged in user has access to it
   *
   * @param id
   * @return {Promise<?>}
   */
  async show (id) {
    const credential = await passwords.findOne({ _id: ObjectId(id) })

    if (!credential) {
      throw new Error('Requested credential doesn\'t exists or currently logged in user has no permission to access it')
    }

    await this.services.personas.show(credential.personaId)

    return credential
  }

  /**
   * edits the requested credential with a full or partial credential object
   *
   * @param id password id
   * @param credential partial or full credential object
   * @return {Promise<?>} modified credential object
   */
  async edit (id, credential) {
    credential = credential || {}

    await this.show(id)

    const acceptableKeys = ['name', 'uri', 'username', 'password']
    const payload = Object.keys(credential)
      .filter(key => acceptableKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = credential[key]
        return obj
      }, {})

    validate(payload)

    await passwords.updateOne({
      _id: ObjectId(id)
    }, dot.flatten(payload))

    return await this.show(id)
  }

  /**
   * deletes the requested credential
   *
   * @param id credential id
   * @return {Promise<null>} literally 'null'
   */
  async delete (id) {
    await this.show(id)
    await passwords.deleteOne({ _id: ObjectId(id) })
    return null
  }
})
