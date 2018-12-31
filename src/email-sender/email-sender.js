const { promisify } = require('util')
const sgMail = require('@sendgrid/mail')

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
  // FIXME determine which email address you want to use. This uses event sender
  const userAddress = body.address
  const item = await dynamoDB.getItem({
    Key: { address: { S: userAddress } },
    TableName: 'user-settings',
    AttributesToGet: ['email']
  })

  let emailAddress
  if (item && item.Item && item.Item.email) {
    emailAddress = item.Item.email.S
  }

  if (emailAddress == null)
    return callback(null, {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'No registered email address.'
      })
    })

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
    },
  }
  sgMail.send(msg)

  callback(null, {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}
