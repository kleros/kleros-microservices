const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')
const whitelist = require('../utils/whitelist')

// Safe helpers
const ERC1271_ABI = [
  { type: 'function', name: 'isValidSignature', stateMutability: 'view',
    inputs: [
      { name: '_hash',      type: 'bytes32', internalType: 'bytes32' },
      { name: '_signature', type: 'bytes',   internalType: 'bytes'   }
    ],
    outputs: [
      { name: 'magicValue', type: 'bytes4',  internalType: 'bytes4'  }
    ]
  }
]
const MAGIC_VALUE = '0x1626ba7e'
const DERIVED_ACCOUNT_KEY =
  'To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.'

const buildDigest = (web3, msg) =>
  web3.utils.keccak256("\x19Ethereum Signed Message:\n" + msg.length + msg)
//-----------------------------------------------------

module.exports.get = async (event, _context, callback) => {
  // Initialize web3
  const web3 = await _web3()

  // Validate signature
  const payload = JSON.parse(event.body).payload
  try {
    if (
      (await web3.eth.accounts.recover(
        JSON.stringify(payload.settings),
        payload.signature
      )) !==
      (await dynamoDB.getItem({
        Key: { address: { S: payload.address } },
        TableName: 'user-settings',
        ProjectionExpression: 'derivedAccountAddress'
      })).Item.derivedAccountAddress.S
    )
      throw new Error('Signature does not match supplied address.')
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Signature is invalid or does not match supplied address.'
      })
    })
  }

  // Fetch settings and return them
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        settings: await dynamoDB.getItem({
          Key: { address: { S: payload.address } },
          TableName: 'user-settings',
          ProjectionExpression: whitelist
            .filter(k => payload.settings[k])
            .join(', ')
        })
      }
    })
  })
}

module.exports.patch = async (event, _context, callback) => {
  // Initialize web3
  const web3 = await _web3()

  // Validate signature
  const payload = JSON.parse(event.body).payload
  const isSafeLink = !!payload.isSafeLink

  try {
    if (isSafeLink) {
      // One-time link call must be signed by the Safe itself
      const valid = await new web3.eth.Contract(ERC1271_ABI, payload.address)
        .methods.isValidSignature(
          buildDigest(web3, DERIVED_ACCOUNT_KEY),
          payload.signature
        )
        .call()
      if (valid !== MAGIC_VALUE)
        throw new Error('Initial link must be signed by Safe.')
    } else {
      const account = await web3.eth.accounts.recover(
        JSON.stringify(payload.settings),
        payload.signature
      )
      if (
        account !== payload.address &&
        account !==
          (await dynamoDB.getItem({
            Key: { address: { S: payload.address } },
            TableName: 'user-settings',
            ProjectionExpression: 'derivedAccountAddress'
          })).Item.derivedAccountAddress.S
      )
        throw new Error('Signature does not match supplied address.')
    }
  } catch (err) {
    console.error(err)
    return callback(null, {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Signature is invalid or does not match supplied address.'
      })
    })
  }

  // Update settings and return them
  const updateKeys = whitelist.filter(k => payload.settings[k])
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        settings: await dynamoDB.updateItem({
          Key: { address: { S: payload.address } },
          TableName: 'user-settings',
          UpdateExpression: `SET ${updateKeys
            .map(k => `${k} = :_${k}`)
            .join(', ')}`,
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