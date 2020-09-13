// @ts-check
 const CosmosClient = require('@azure/cosmos').CosmosClient
 const debug = require('debug')('maskModel')

function calcGeoDist( lat, lon, dist )
{
  //Earth’s radius, sphere
  const R=6378137.0

  //Coordinate offsets in radians
  const dLat = dist/R
  const dLon = dist/(R*Math.cos(Math.PI*lat/180.0))

    //OffsetPosition, decimal degrees
    return {latitude: lat + dLat * 180.0/Math.PI, longitude: lon + dLon * 180.0/Math.PI }
}

 class maskModel {
   /**
    * Manages reading, adding, and updating Tasks in Cosmos DB
    * @param {CosmosClient} cosmosClient
    * @param {string} databaseId
    * @param {string} containerId
    */
   constructor(cosmosClient, databaseId, containerId) {
     this.client = cosmosClient
     this.databaseId = databaseId
     this.collectionId = containerId

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
   }

   async find(latitude, longitude, size) {
        // https://en.wikipedia.org/wiki/Decimal_degrees
        debug('Querying for items from the database ' + latitude + " " + longitude + " " + size )
        if (!this.container) {
        throw new Error('Collection is not initialized.')
        }
        // acknowledged that this query breaks at the poles and at the international date line
        const top_left = calcGeoDist( latitude, longitude, -1 *size)
        const bottom_right = calcGeoDist( latitude, longitude, size)
        const querySpec = {
            query: "SELECT * FROM mask_reports mr where mr.location.latitude <= @lat_right and mr.location.latitude >= @lat_left and mr.location.longitude >= @lng_bottom and mr.location.longitude <= @lng_top",
            parameters: [
                { name: "@lat_left", value: top_left.latitude },
                { name: "@lat_right", value: bottom_right.latitude },
                { name: "@lng_bottom", value: top_left.longitude },
                { name: "@lng_top", value: bottom_right.longitude }     
               ]
        }
        //debug(querySpec)
        const { resources } = await this.container.items.query(querySpec).fetchAll()
        return resources
   }

   async addItem(item) {
     debug('Adding an item to the database')
     const { resource: doc } = await this.container.items.create(item)
     return doc
   }

   async updateItem(itemId) {
     debug('Update an item in the database')
     const doc = await this.getItem(itemId)
     doc.completed = true

     const { resource: replaced } = await this.container
       .item(itemId, partitionKey)
       .replace(doc)
     return replaced
   }

   async getItem(itemId) {
     debug('Getting an item from the database')
     const { resource } = await this.container.item(itemId, partitionKey).read()
     return resource
   }
 }

 module.exports = maskModel