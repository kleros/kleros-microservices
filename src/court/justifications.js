const _web3 = require('../utils/web3')
const KlerosLiquid = require('../assets/contracts/KlerosLiquid.json')
const dynamoDB = require('../utils/dynamo-db')

module.exports.put = async (event, _context, callback) => {
  // Initialize web3 and contracts
  const web3 = await _web3()
  const klerosLiquid = new web3.eth.Contract(
    KlerosLiquid.abi,
    process.env.KLEROS_LIQUID_ADDRESS
  )

  // Validate signature
  const payload = JSON.parse(event.body).payload
  try {
    if (
      (await web3.eth.accounts.recover(
        JSON.stringify(payload.justification),
        payload.signature
      )) !==
      (await dynamoDB.getItem({
        Key: { address: { S: payload.address } },
        TableName: 'user-settings',
        ProjectionExpression: 'derivedAccountAddress'
      })).Item.derivedAccountAddress.S
    )
      throw new Error(
        "Signature does not match the supplied address' derived account address for justifications."
      )
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error:
          "Signature is invalid or does not match the supplied address' derived account address for justifications."
      })
    })
  }

  // Verify votes belong to user
  for (const voteID of payload.justification.IDs)
    if (
      (await klerosLiquid.methods
        .getVote(
          payload.justification.disputeID,
          payload.justification.appeal,
          voteID
        )
        .call()).account !== payload.address
    )
      return callback(null, {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error:
            'Not all of the supplied vote IDs belong to the supplied address.'
        })
      })

  // Save justification
  await dynamoDB.putItem({
    Item: {
      disputeID: { N: String(payload.justification.disputeID) },
      appeal: { N: String(payload.justification.appeal) },
      IDs: { NS: payload.justification.IDs },
      justification: { S: payload.justification.justification }
    },
    TableName: 'justifications'
  })
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        votes: payload.justification
      }
    })
  })
}
