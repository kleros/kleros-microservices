const { promisify } = require('util')

const AWS = require('aws-sdk')

module.exports.post = async (event, _context, callback) => {
  // Parse input
  const { fileName, base64EncodedData } = JSON.parse(event.body).payload

  // Upload file to S3 bucket
  AWS.config.update({ region: process.env.AWS_REGION })
  const bucket = new AWS.S3({
    params: { Bucket: process.env.CFS_S3_BUCKET }
  })
  bucket.upload = promisify(bucket.upload)
  const { Location: location } = await bucket.upload({
    Key: fileName,
    Body: Buffer.from(base64EncodedData, 'base64'),
    ContentEncoding: 'base64',
    ACL: 'public-read'
  })

  // Return file URL
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ payload: { fileURL: location } })
  })
}
