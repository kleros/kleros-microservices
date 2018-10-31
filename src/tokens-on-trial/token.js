module.exports.post = async (event, _context, callback) => {
  callback(null, {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'All systems go'
      })
  })
}
