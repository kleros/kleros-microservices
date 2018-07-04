const _web3 = require('../utils/web3')
const ArbitrablePermissionList = require('../assets/contracts/ArbitrablePermissionList.json')

module.exports.post = async (_event, _context, callback) => {
  const web3 = await _web3()
  const arbitrablePermissionList = new web3.eth.Contract(
    ArbitrablePermissionList.abi,
    process.env.ARBITRABLE_PERMISSION_LIST_ADDRESS
  )

  const item = await arbitrablePermissionList.methods
    .items('0x0000000000000000000000000000000000000000000000000000000000000000')
    .call()

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(item)
  })
}
