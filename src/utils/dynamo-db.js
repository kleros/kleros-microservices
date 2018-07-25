const { promisify } = require('util')

const { DynamoDB } = require('aws-sdk')

const dynamoDB = new DynamoDB({ apiVersion: '2012-08-10', region: 'us-east-2' })
dynamoDB.getItem = promisify(dynamoDB.getItem)
dynamoDB.putItem = promisify(dynamoDB.putItem)

export default dynamoDB
