const _web3 = require('../utils/web3')
const KlerosLiquid = require('../assets/contracts/KlerosLiquid.json')
const dynamoDB = require('../utils/dynamo-db')

module.exports.get = async (event, _context, callback) => {
  // Fetch justifications and return them
  const payload = JSON.parse(event.body).payload
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        justifications: await dynamoDB.query({
          ExpressionAttributeValues: {
            ':disputeIDAndAppeal': {
              S: `${payload.disputeID}-${payload.appeal}`
            }
          },
          KeyConditionExpression: 'disputeIDAndAppeal = :disputeIDAndAppeal',
          TableName: `${payload.network}-justifications`
        })
      }
    })
  })
}

module.exports.put = async (event, _context, callback) => {
  // Initialize web3 and contracts
  const web3 = await _web3()
  const klerosLiquid = new web3.eth.Contract(
    KlerosLiquid.abi,
    process.env.KLEROS_LIQUID_ADDRESS
  )

  const payload = JSON.parse(event.body).payload

  // Verify votes belong to user
  const dispute = await klerosLiquid.methods.getDispute(
    payload.justification.disputeID
  ).call()

  // Get number of votes in current round
  const votesInRound = dispute.votesLengths[payload.justification.appeal]

  let drawn = false
  let voteID
  for (let i = 0; i < Number(votesInRound); i++) {
    const vote = await klerosLiquid.methods
      .getVote(payload.justification.disputeID, payload.justification.appeal, i)
      .call()
    if (vote.account === payload.address) {
      // If voted, can no longer submit justification.
      if (vote.voted) {
        return callback(null, {
          statusCode: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: 'This address has already cast their vote.'
          })
        })
      }
      // Once we know address has been drawn we can stop searching.
      drawn = true
      voteID = i
      break
    }
  }

  if (!drawn) {
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'This address was not drawn.'
      })
    })
  }

  // Save justification.
  await dynamoDB.putItem({
    Item: {
      disputeIDAndAppeal: {
        S: `${payload.justification.disputeID}-${payload.justification.appeal}`
      },
      address: {
        S: payload.address
      },
      voteID: { N: String(voteID) },
      justification: { S: payload.justification.justification }
    },
    TableName: `${payload.network}-justifications`
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
