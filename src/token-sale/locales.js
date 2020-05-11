const { promisify } = require('util')

const AWS = require('aws-sdk')

const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')
const getEnvVars = require('../utils/get-env-vars')

module.exports.put = async (event, _context, callback) => {
  // Initialize web3 and contract

  // Check that the image has been added to the contract
  const body = JSON.parse(event.body)
  const transactionHash = body.txHash
  const country = body.country
  const ip = body.ip

  if (!transactionHash)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Invalid transaction'
      })
    })

  const web3 = await _web3()
  let transaction = await web3.eth.getTransaction(transactionHash)
  let verified = false
  // If node hasn't gotten tx yet we cannot verify it. Add to db with unverified flag so we can do later dilligence on it if necessary
  if (transaction) {
    const contract_var = body.network ? `TOKEN_SALE_CONTRACT_ADDRESS_${body.network.toUpperCase()}` : `TOKEN_SALE_CONTRACT_ADDRESS`

    if (transaction.to !== process.env[contract_var]) {
      return callback(null, {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Invalid transaction'
        })
      })
    }

    if (transaction.value === '0') {
      return callback(null, {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Invalid transaction'
        })
      })
    }
      verified = true
  }

  // Save tx and country
  await dynamoDB.putItem({
    Item: {
      transactionHash: {
        S: `${transactionHash}`
      },
      country: {
        S: `${country}`
      },
      ip: {
        S: `${ip}`
      },
      verified: {
        BOOL: verified
      }
    },
    TableName: `${body.network ? `token-sale-locales-${body.network}` : 'token-sale-locales'}`
  })

  // Return image URL
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}
