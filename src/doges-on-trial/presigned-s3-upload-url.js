module.exports.get = async (_event, _context, callback) => {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello World' })
  })
}
