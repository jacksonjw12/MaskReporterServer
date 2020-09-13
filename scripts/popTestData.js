/*
Populate the mask report database with fake data:
Arguments: <name> <latitude> <longitude> <size (meters)> <density> <maskiness quotient> <dest>
    - name - name of the dataset, makes it easy to remove later, GUID or string
    - latitude / longitdue - center of data set
    - size - distance of square around mid point to populate in meters
    - density - density of mask reports, 0 - 100 where 0 is not very dense and 100 is extremely dense
    - maskiness quotient - 0 - 100 where 0 is very little mask wearing and 100 is good mask wearing
    - dest - set to 'kml' to output kml file, 'db' to output to database

 node popTestData.js test 37.831145 -122.36868 1000 50 50 kml

 how to run on Windows git bash
 bash -c "node popTestData.js test 37.22134 -121.97964 500 25 25 kml" > ~/Downloads/test.kml
*/
const CosmosClient = require('@azure/cosmos').CosmosClient
const debug = require('debug')('popScript')

function parseArgs()
{
    ret = {}

    // command line args
    var args = process.argv.slice(2);
    i = 0
    ret.name = args[i++]
    ret.latitude = Number(args[i++])
    ret.longitude = Number(args[i++])
    ret.size = Number(args[i++])
    ret.density = Number(args[i++])
    ret.maskiness = Number(args[i++])
    ret.dest = args[i++]
    return ret
}

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

async function init(dbAuthKey, databaseId, collectionId) {
    
    debug('Setting up the database...')
    ret = {}

    const cosmosClient = new CosmosClient({
		endpoint: dbhost,
		key: dbauthKey
      })
    ret.cosmosClient = cosmosClient
    const dbResponse = await cosmosClient.databases.createIfNotExists({
        id: databaseId
    })
    ret.database = dbResponse.database
    debug('Setting up the database...done!')
    debug('Setting up the container...')
    const coResponse = await ret.database.containers.createIfNotExists({
        id: collectionId
    })
    ret.container = coResponse.container
    debug('Setting up the container...done!')
    return ret
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI/180)
  }

function generatePoints(args)
{
    //debug("generagePoints")

    // distribution of maskiness
    masky = (args.maskiness) / 100.0
    maskDirection = 1
    if ( masky <= 0.5 ) {
        maskDirection = -1
        masky = 1.0 - masky
    }
    maskiness = new Array(100)
    for (i=0 ; i<maskiness.length ; i++) {
        maskiness[i] = Math.floor(5.0*Math.random())
        if (masky != 0.5 && Math.random() <= masky) {
            maskiness[i] = Math.max(0, Math.min(4, maskiness[i] + maskDirection))
        }
    }
    
    // how big an area are we trying to fill in? - args.size
    // density is a percentage from min to max meters
    const density = (100.0 - args.density) / 100.0
    const densityMin = 400.0
    const densityMax = 800.0
    numpoints = (args.size * args.size) / (densityMin + (densityMax - densityMin)*density)
    points = []
    // center point - points.push({latitude: args.latitude, longitude: args.longitude, mask: 4})
    upperLeft = calcGeoDist(args.latitude, args.longitude, -1.0 * args.size / 2.0)
    for ( i=0 ; i<numpoints ; i++ ) {
        a = calcGeoDist(upperLeft.latitude, upperLeft.longitude,  Math.random() * args.size)
        b = calcGeoDist(upperLeft.latitude, upperLeft.longitude,  Math.random() * args.size)

        points.push({
            latitude: a.latitude,
            longitude: b.longitude,
            mask: maskiness[Math.floor(100.0 * Math.random())]
        })
    }

    // provide some grouping of data by allowing influencers to change neighbors
    for ( i=0 ; i<numpoints ; i++ ) {
        // 5% chance of this point being an influencer
        if ( Math.random() >= 0.05 ) {
            continue
        }
        // this point is an influencer so look for neighbors (<100 meters) and bring them closer to same maskiness
        for ( j=0 ; j<numpoints ; j++ ) {
            if ( j == i ) {
                continue;       //don't influence yourself
            }

            if ( getDistanceFromLatLonInKm(points[i].latitude, points[i].longitude, points[j].latitude, points[j].longitude) <= 0.1 ) {
                // influence this point if they're not already the same
                if ( points[j].mask < points[i].mask ) {
                    points[j].mask++;
                }
                else if ( points[j].mask > points[i].mask ) {
                    points[j].mask--;
                }
            }

        }
    }

    return points
}

function outputKML(points)
{
    //debug("outputKML")

    // emit boilerplate
    console.log("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
    console.log("<kml xmlns=\"http://www.opengis.net/kml/2.2\">")
    console.log("<Document>")

    // color styles
    colors = ["ff0000ff","ff002bd4","ff008080","ff00bf40","ff00ff00"]
    for (i=0 ; i<colors.length ; i++ ) {
        console.log("<Style id=\"Mask" + i + "\">")
        console.log("<IconStyle>")
           console.log("<color>" + colors[i] + "</color>")
           console.log("<scale>1</scale>")
           console.log("<Icon>")
            console.log("<href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>")
           console.log("</Icon>")
        console.log("</IconStyle>")
        console.log("</Style>")
    }

    // points
    for (i=0 ; i<points.length ; i++) {
        console.log("<Placemark>")
            //console.log("<name>IconStyle.kml</name>")
            console.log("<styleUrl>#Mask" + points[i].mask + "</styleUrl>")
            console.log("<Point>")
            console.log("<coordinates>" + points[i].longitude + "," + points[i].latitude + ",0</coordinates>")
            console.log("</Point>")
        console.log("</Placemark>")
    }

    //emit closing boilerplate
    console.log("</Document>")
    console.log("</kml>")
}

async function outputDB(args, dbInfo, points)
{
    for ( i=0 ; i<points.length ; i++ ) {
        report = { 
			user_id: args.name,
			location: {
				latitude: points[i].latitude,
				longitude: points[i].longitude,
				precision: 10
			},
			maskval: points[i].mask + 1
        }
        await dbInfo.container.items.create(report)
    }
}

async function main() {
    args = parseArgs()

    dbInfo = {}
    if ( args.dest == "DB" ) {
        console.log("Populate DB")
        containerId = "mask_reports";
        dbhost = process.env.DBHOST;
        dbauthKey = process.env.DBAUTHKEY;
        databaseId = "mask-reporter-db";
        if ( process.env.DATABASEID ) {
            databaseId = process.env.DATABASEID
            debug("datbase " + databaseId)
        }

        // setup the database
        dbInfo = await init(dbauthKey, databaseId, containerId)
    }

    points = generatePoints(args)

    if (args.dest == "DB") {
        debug("Output to database")
        await outputDB(args, dbInfo, points)
    }
    else {
        outputKML(points)
    }


}

main()
