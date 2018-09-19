const Web3 = require('web3')

const getEnvVars = require('./get-env-vars')

module.exports = async () => {
  const { INFURA_URL } = await getEnvVars(['INFURA_URL'])
  return new Web3(new Web3.providers.HttpProvider(INFURA_URL))
}
