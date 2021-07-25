module.exports = {
  // See https://docs.mongodb.com/manual/reference/connection-string/
  MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017',
  MONGO_DB: process.env.MONGO_DB || 'persona',
  PASSWORD_COLLECTION: process.env.PASSWORD_COLLECTION || 'passwords',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/service-account-file.json'
}
