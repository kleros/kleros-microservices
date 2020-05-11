const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')
const getEnvVars = require('../get-env-vars')
const whitelist = require('../utils/whitelist')

module.exports.post = async (event, _context, callback) => {
  // Initialize web3
  const web3 = await _web3()

  // Validate signature
  const payload = JSON.parse(event.body).payload
  try {
    const account = await web3.eth.accounts.recover(
      JSON.stringify(payload.email),
      payload.signature
    )
    const { ENTROPY } = await getEnvVars(['ENTROPY'])
    const lambdaAccount = web3.eth.accounts.create(ENTROPY)
    if (
      account !== lambdaAccount.address
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
    if (payload.dapp)
      return k.includes(payload.dapp)
    return false
  })
  await dynamoDB.updateItem({
    Key: { address: { S: payload.address } },
    TableName: 'user-settings',
    UpdateExpression: `SET ${updateKeys
      .map(k => `${k} = :_${k}`)
      .join(', ')}`,
    ExpressionAttributeValues: updateKeys.reduce((acc, k) => {
      acc[`:_${k}`] = false
      return acc
    }, {})
  })

  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: `Unsubscribed from Kleros ${payload.dapp} notifications.`
    })
  })
}
