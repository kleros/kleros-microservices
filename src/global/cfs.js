const { promisify } = require('util')

const Archon = require('@kleros/archon').default
const AWS = require('aws-sdk')

module.exports.post = async (event, _context, callback) => {
  // Parse input and validate hash
  const { fileName, base64EncodedData } = JSON.parse(event.body).payload
  if (!Archon.utils.validMultihash(fileName, base64EncodedData))
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Invalid file hash.'
      })
    })

  // Parse image
  let _match, mimeType, base64Data
  try {
    ;[_match, mimeType, base64Data] = base64EncodedData.match(
      /^data:(.+);base64,(.+)$/
    )
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid base64 encoded data.' })
    })
  }

  // Check size
  if (base64Data.length * (3 / 4) > 1e7)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'File is too big. It has to be smaller than 1000KB.'
      })
    })

  // Upload file to S3 bucket
  AWS.config.update({ region: process.env.AWS_REGION })
  const bucket = new AWS.S3({
    params: { Bucket: process.env.CFS_S3_BUCKET }
  })
  bucket.upload = promisify(bucket.upload)
  const { Location: location } = await bucket.upload({
    Key: fileName,
    Body: Buffer.from(base64Data, 'base64'),
    ContentEncoding: 'base64',
    ContentType: mimeType,
    ACL: 'public-read'
  })

  // Return file URL
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ payload: { fileURL: location } })
  })
}
