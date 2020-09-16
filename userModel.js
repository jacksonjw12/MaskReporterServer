// @ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient
const RequestOptions = require('@azure/cosmos')
const debug = require('debug')('userModel')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

class userModel {
  /**
   * Manages reading, adding, and updating Users in Cosmos DB
   * @param {CosmosClient} cosmosClient
   * @param {string} databaseId
   * @param {string} containerId
   */
  constructor(cosmosClient, databaseId, containerId, globalSecret, defaultTTL) {
    this.client = cosmosClient
    this.databaseId = databaseId
    this.collectionId = containerId
    this.tokenId = containerId + "_tokens"
    this.globalSecret = globalSecret
    this.defaultTTL = defaultTTL

    this.database = null
    this.container = null
  }

  async init() {
    debug('Setting up the database...')
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId
    })
    this.database = dbResponse.database
    debug('Setting up the database...done!')
    debug('Setting up the container...')
    const coResponse = await this.database.containers.createIfNotExists({
      id: this.collectionId
    })
    this.container = coResponse.container
    debug('Setting up the container...done!')
    debug('Setting up the token cache...')
    const tokenResponse = await this.database.containers.createIfNotExists({
      id: this.tokenId, defaultTtl: this.defaultTTL
    })
    this.tokenContainer = tokenResponse.container
    debug('Setting up the token cache...done!')
  }

async isAuthenticated(token) {
    // is the token still valid
    const querySpec = {
        query: "SELECT * FROM mask_users_tokens mut where mut.token = @token",
        parameters: [
            { name: "@token", value: token}     
            ]
    }
    const { resources } = await this.tokenContainer.items.query(querySpec).fetchAll()
    if (resources && resources.length == 1 ) {
        debug("userModel says auth")
        return true
    }
    return false
}

async login(user) {
    debug('Querying for user ' + user.user_id)
    if (!this.container) {
        throw new Error('Collection is not initialized.')
    }
    const querySpec = {
        query: "SELECT * FROM mask_users mu where mu.user_id = @user_id and mu.password = @password",
        parameters: [
            { name: "@user_id", value: user.user_id },
            { name: "@password", value: user.password}     
            ]
    }
    const { resources } = await this.container.items.query(querySpec).fetchAll()
    if (resources && resources.length == 1 ) {
        return {"auth_token": await this.createToken(resources[0])}
    }
    return {}
}

  async createToken(user) {
    //debug(user)
    var token = jwt.sign(user, this.globalSecret, {expiresIn: '1h' });

    // add the new token
    const { resource: doc } = await this.tokenContainer.items.create({"token": token, "user_id": user.user_id})
    
    debug("created toke for user " + user.user_id)
    return token
  }

  async addItem(item) {
    const uuid = uuidv4()
    debug('Adding a user to the database ' + uuid)
    item.user_id = uuid
    const { resource: doc } = await this.container.items.create(item)
    return {user_id: uuid, user_name: doc.user_name}
  }

  /*
  async updateItem(itemId) {
    debug('Update an item in the database')
    const doc = await this.getItem(itemId)
    doc.completed = true

    const { resource: replaced } = await this.container
      .item(itemId, partitionKey)
      .replace(doc)
    return replaced
  }
  */

  async getItem(itemId) {
    debug('Getting an item from the database')
    const { resource } = await this.container.item(itemId, partitionKey).read()
    return resource
  }
}

module.exports = userModel