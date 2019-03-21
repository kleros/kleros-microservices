const _web3 = require('../utils/web3')
const dynamoDB = require('../utils/dynamo-db')

module.exports.put = async (event, _context, callback) => {
  // Initialize web3
  const web3 = await _web3()

  // Get `derivedAccountAddressForJustifications`
  console.log(
    event,
    callback,
    web3,
    await dynamoDB.getItem({
      Key: { address: { S: '0x98a3A786F2cAa319Dc234d28fcd6e362A9750709' } }
    })
  )
}
