import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set')
}

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
    })

    await client.connect()
    const db = client.db('ktaby')

    cachedClient = client
    cachedDb = db

    console.log('Connected to MongoDB')
    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

export async function closeDatabase() {
  if (cachedClient) {
    try {
      await cachedClient.close()
      cachedClient = null
      cachedDb = null
      console.log('Closed MongoDB connection')
    } catch (error) {
      console.error('Error closing MongoDB connection:', error)
    }
  }
}

export async function getDatabase() {
  if (!cachedDb) {
    const { db } = await connectToDatabase()
    return db
  }
  return cachedDb
}
