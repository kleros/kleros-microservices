const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')

module.exports.put = async (event, _context, callback) => {
  const web3 = await _web3()

  const payload = JSON.parse(event.body).payload
  const tokenID = web3.sha3(JSON.stringify(payload.token))
  const { name, ticker, address, URI } = payload.token
  const token = {
    tokenID: { S: tokenID },
    name: { S: name },
    ticker: { S: ticker },
    address: { S: address },
    URI: { S: URI }
  }

  try {
    await dynamoDB.putItem({
      TableName: 'token',
      Item: token
    })

    callback(null, {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ payload: { token } })
    })
  } catch (err) {
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err })
    })
  }
}
