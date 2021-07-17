const { RpcWorker, RpcProvider } = require('@persona/infra/service-broker')

const MongoClient = require('mongodb').MongoClient
const MongoObjectID = require('mongodb').ObjectId
// const admin = require('firebase-admin')

const { MONGO_CONNECTION_STRING, PASSWORD_COLLECTION_NAME } = require('./config')

let db

// new RpcWorker (service, provider, address)
// - service: string, human readable service set name, preferably in plural form
// - RpcProvider: a class extends from RpcProvider
// - address: optional, ZeroMQ connection address, fallback to `BROKER_ADDR` env var when not provided
module.exports = new RpcWorker('passwords', class extends RpcProvider {
  // a new instance of RpcProvider is created for each request, so anything mounted to `this` is only available for that
  // request only

  // a service-wide initializer: this hook will only run once for a service
  async [RpcProvider.init] () {
    // the init hook is perfect for initializing external services like databases:
    console.log("creating connection")
    const client = new MongoClient(MONGO_CONNECTION_STRING)
    await client.connect()
  }

  async [RpcProvider.before] () {

  }
  async create (password) {
    try {
      const collection = db.collection(PASSWORD_COLLECTION_NAME)
      // insertOne automatically adds _id to the object. type is new ObjectId('id')
      await collection.insertOne(password)
    } catch (err) {
      console.err(err)
    }
    return password
  }

  async list (count) {
    // todo: return list of object within count. This implies the collection has order
    try {
      const collection = db.collection(PASSWORD_COLLECTION_NAME)
      const searchCursor = await collection.find()
      return await searchCursor.toArray()
    } catch (err) {
      console.log('Error during list: ', err)
    }
  }

  async show (id) {
    // TODO: handle type error
    try {
      const mongoObjectID = new MongoObjectID(id)
      const collection = db.collection(PASSWORD_COLLECTION_NAME)
      const searchCursor = await collection.find({ _id: mongoObjectID })

      const passwordFound = await searchCursor.toArray()
      console.log('persona found:', passwordFound)
      return passwordFound
    } catch (err) {
      console.log(err)
      return -1
    }
  }

  async edit (id, password) {
    // ignore email and id from edit
    delete password.email
    delete password._id
    const mongoObjectID = new MongoObjectID(id)
    try {
      const collection = db.collection(PASSWORD_COLLECTION_NAME)
      return await collection.updateOne({ _id: mongoObjectID }, { $set: password })
    } catch (err) {
      console.log(err)
      return -1
    }
  }

  async delete (id) {
    const mongoObjectID = new MongoObjectID(id)
    try {
      const collection = db.collection(PASSWORD_COLLECTION_NAME)
      await collection.deleteOne({ _id: mongoObjectID })
    } catch (err) {
      console.log(err)
    }
  }


  // a request-scoped after hook: this hook runs for every request after your actually method
  async [RpcProvider.after] () {
    // the after hook is perfect your cleaning things up, if needed
  }
})
