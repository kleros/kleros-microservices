const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')

module.exports.patch = async (event, _context, callback) => {
  // Initialize web3
  const web3 = await _web3()

  // Validate signature
  const payload = JSON.parse(event.body).payload
  if (
    (await web3.eth.accounts.recover(
      JSON.stringify(payload.settings),
      payload.signature
    )) !== payload.address
  )
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Signature is invalid or does not match supplied address.'
      })
    })

  // Update settings and return them
  const updateKeys = ['email', 'dogecoinAddress'].filter(
    k => payload.settings[k]
  )
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        settings: await dynamoDB.updateItem({
          Key: { address: { S: payload.address } },
          TableName: 'user-settings',
          UpdateExpression: updateKeys.map(k => `SET ${k} = :_${k}`).join(', '),
          ExpressionAttributeValues: updateKeys.reduce((acc, k) => {
            acc[`:_${k}`] = payload.settings[k]
            return acc
          }, {}),
          ReturnValues: 'ALL_NEW'
        })
      }
    })
  })
}
