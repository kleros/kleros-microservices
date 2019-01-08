/**
 * Example email sending lambda function that works with events.kleros.io.
 * Replace the email lookup with your subscribers for an event and replace your sendgrid template.
 */
const sgMail = require('@sendgrid/mail')
const Web3 = require('web3')

const dynamoDB = require('../utils/dynamo-db')

module.exports.post = async (event, _context, callback) => {
  // Get the event body
  const body = JSON.parse(event.body)
  if (body == null) {
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'No event log passed in body.'
      })
    })
  }

  // FIXME determine which email address you want to use. This example uses the caller of tx that kicks off the event
  const txHash = body.transactionHash

  // Find the sender of the tx
  const web3 = new Web3(process.env.PROVIDER_URI)
  const transaction = await web3.eth.getTransaction(txHash)

  // Fetch from the user-settings table
  const item = await dynamoDB.getItem({
    Key: { address: { S: transaction.from } },
    TableName: 'user-settings',
    AttributesToGet: ['email']
  })

  let emailAddress
  if (item && item.Item && item.Item.email) emailAddress = item.Item.email.S

  if (emailAddress == null)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'No registered email address.'
      })
    })

  // Sendgrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  sgMail.setSubstitutionWrappers('{{', '}}')

  // FIXME Add your email template and message here
  const msg = {
    to: emailAddress,
    from: {
      name: 'Kleros',
      email: 'contact@kleros.io'
    },
    templateId: process.env.SENDGRID_TEMPLATE_ID,
    dynamic_template_data: {
      subject: 'Test Email Update',
      eventName: body.eventName
    }
  }
  sgMail.send(msg)

  callback(null, {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}
