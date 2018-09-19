const { promisify } = require('util')

const AWS = require('aws-sdk')
const imageSize = require('image-size')
const dataURIToBuffer = require('data-uri-to-buffer')

const _web3 = require('../utils/web3')
const ArbitrablePermissionList = require('../assets/contracts/ArbitrablePermissionList.json')

module.exports.post = async (event, _context, callback) => {
  // Initialize web3 and contract
  const web3 = await _web3()
  const arbitrablePermissionList = new web3.eth.Contract(
    ArbitrablePermissionList.abi,
    process.env.ARBITRABLE_PERMISSION_LIST_ADDRESS
  )

  // Check that the image has been added to the contract
  const dataURL = JSON.parse(event.body).payload.imageFileDataURL
  const hash = web3.utils.keccak256(dataURL)
  const item = await arbitrablePermissionList.methods.items(hash).call()
  if (
    Number(item.status) !== 0 &&
    (await arbitrablePermissionList.getPastEvents('ItemStatusChange', {
      filter: { value: hash },
      fromBlock: 0,
      toBlock: 'latest'
    }))[0].blockNumber >
      Number(process.env.ARBITRABLE_PERMISSION_LIST_BLOCK_BLOCK_NUMBER)
  )
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'This image has already been added to the contract.'
      })
    })

  // Parse image
  let _match, mimeType, base64Data
  try {
    ;[_match, mimeType, base64Data] = dataURL.match(
      /^data:(image\/(?:png|gif|jpe?g));base64,(.+)$/
    )
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid base64 encoded image data URL.' })
    })
  }

  // Check size
  if (base64Data.length * (3 / 4) > 3e6)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Image is too big. It has to be smaller than 300KB.'
      })
    })

  // Check dimensions
  const { width, height } = imageSize(dataURIToBuffer(dataURL))
  if (width < 250 || height < 250)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error:
          'Image is too small. It must be more than 250px wide and 250px tall.'
      })
    })

  // Upload image to S3 bucket
  AWS.config.update({ region: process.env.AWS_REGION })
  const bucket = new AWS.S3({
    params: { Bucket: process.env.DOGES_ON_TRIAL_DOGE_IMAGES_S3_BUCKET }
  })
  bucket.upload = promisify(bucket.upload)
  const { Location: location } = await bucket.upload({
    Key: hash,
    Body: Buffer.from(base64Data, 'base64'),
    ContentEncoding: 'base64',
    ContentType: mimeType,
    ACL: 'public-read'
  })

  // Return image URL
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ payload: { imageURL: location } })
  })
}
