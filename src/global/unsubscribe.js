const Web3 = require('web3')
const dynamoDB = require('../utils/dynamo-db')
const getEnvVars = require('../utils/get-env-vars')
const whitelist = require('../utils/whitelist')

module.exports.get = async (event, _context, callback) => {
  // Initialize web3
  const web3 = new Web3()

  account = event.queryStringParameters.account
  signature = event.queryStringParameters.signature
  dapp = event.queryStringParameters.dapp

  // Validate signature
  try {
    const recoveredAccount = await web3.eth.accounts.recover(
      account,
      signature
    )
    const { PRIVATE_KEY } = await getEnvVars(['PRIVATE_KEY'])
    const lambdaAccount = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY.replace(/^\s+|\s+$/g, ''))
    if (
      recoveredAccount !== lambdaAccount.address
    )
      throw new Error('Signature does not match for this email address. Email contact.kleros.io.')
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Signature does not match for this email address. Email contact.kleros.io.'
      })
    })
  }

  // Update settings for DApp
  const updateKeys = whitelist.filter(k => {
    if (dapp)
      return k.includes(dapp)
    return false
  })
  await dynamoDB.updateItem({
    Key: { address: { S: account } },
    TableName: 'user-settings',
    UpdateExpression: `SET ${updateKeys
      .map(k => `${k} = :_${k}`)
      .join(', ')}`,
    ExpressionAttributeValues: updateKeys.reduce((acc, k) => {
      acc[`:_${k}`] = {"BOOL": false}
      return acc
    }, {})
  })

  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: `Unsubscribed from Kleros ${dapp} notifications.`
    })
  })
}
