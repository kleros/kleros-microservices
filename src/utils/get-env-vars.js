const { promisify } = require('util')

const AWS = require('aws-sdk')

module.exports = async envVars => {
  AWS.config.update({ region: process.env.AWS_REGION })
  const kms = new AWS.KMS()
  kms.decrypt = promisify(kms.decrypt)
  const decryptedEnvVars = {}

  await Promise.all(
    envVars.map((envVar, i) =>
      kms
        .decrypt({
          CiphertextBlob: Buffer.from(process.env[envVar], 'base64')
        })
        .then(
          data =>
            (decryptedEnvVars[envVars[i]] = data.Plaintext.toString('ascii'))
        )
    )
  )

  return decryptedEnvVars
}
