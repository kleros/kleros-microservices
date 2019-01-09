const sgMail = require('@sendgrid/mail')

module.exports = () => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  sgMail.setSubstitutionWrappers('{{', '}}')

  return sgMail
}
