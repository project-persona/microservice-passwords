module.exports = {
  // See https://docs.mongodb.com/manual/reference/connection-string/
  MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017',
  PASSWORD_COLLECTION_NAME: 'passwords'
}
