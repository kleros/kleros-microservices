const Web3 = require('web3')

const getEnvVars = require('../utils/get-env-vars')
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
  // Validate signature
  const payload = JSON.parse(event.body).payload

  if (!payload.network)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error:
          "Network not specified"
      })
    })

  let klerosLiquidAddress
  let web3Uri
  switch (payload.network) {
    case 'mainnet':
      const {
        INFURA_URL_MAINNET
      } = await getEnvVars(['INFURA_URL_MAINNET'])
      klerosLiquidAddress = process.env.KLEROS_LIQUID_ADDRESS_MAINNET
      web3Uri = INFURA_URL_MAINNET
      break
    case 'kovan':
      const {
        INFURA_URL_KOVAN
      } = await getEnvVars([
        'INFURA_URL_KOVAN'
      ])
      klerosLiquidAddress = process.env.KLEROS_LIQUID_ADDRESS_KOVAN
      web3Uri = INFURA_URL_KOVAN
      break;
    default:
      return callback(null, {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error:
            `No Kleros Liquid address found for network ${payload.network}`
        })
      })
  }

  const web3 = new Web3(new Web3.providers.HttpProvider(web3Uri))

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

  const klerosLiquid = new web3.eth.Contract(
    KlerosLiquid.abi,
    klerosLiquidAddress
  )

  // Verify votes belong to user
  for (const voteID of payload.justification.voteIDs) {
    const vote = await klerosLiquid.methods
      .getVote(
        payload.justification.disputeID,
        payload.justification.appeal,
        voteID
      )
      .call()
    if (vote.account !== payload.address || vote.voted)
      return callback(null, {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error:
            'Not all of the supplied vote IDs belong to the supplied address and are not cast.'
        })
      })
  }

  // Save justification
  await dynamoDB.putItem({
    Item: {
      disputeIDAndAppeal: {
        S: `${payload.justification.disputeID}-${payload.justification.appeal}`
      },
      voteID: {
        N: String(
          payload.justification.voteIDs[
            payload.justification.voteIDs.length - 1
          ]
        )
      },
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
