const _web3 = require('../utils/web3')

module.exports.patch = async (event, _context, callback) => {
  const web3 = await _web3()

  const payload = JSON.parse(event.body).payload
  const tokenID = web3.sha3(JSON.stringify(payload.token))

  const keys = [
    'name',
    'ticker',
    'address',
    'URI',
  ].filter(
    k => payload.token[k]
  )
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        tokenID,
        token: await dynamoDB.putItem({
          Key: { tokenID: { S: tokenID } },
          TableName: 'token',
          UpdateExpression: keys.map(k => `SET ${k} = :_${k}`).join(', '),
          ExpressionAttributeValues: keys.reduce((acc, k) => {
            acc[`:_${k}`] = payload.token[k]
            return acc
          }, {}),
          ReturnValues: 'ALL_NEW'
        })
      }
    })
  })
}
