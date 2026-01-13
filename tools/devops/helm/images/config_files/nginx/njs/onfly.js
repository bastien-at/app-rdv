let fs = require('fs')
let crypto = require('crypto')

async function handler(request) {
  if (request.method !== 'POST') {
    request.return(405, "Method Not Allowed")
    return
  }

  const processingOptions = request.uri.split('/onfly/')[1]
  if (!processingOptions) {
    request.return(400, "Bad Request: Preset not found in URL")
    return
  }

  const hash = crypto.createHash('sha256')
  hash.update(Math.random().toString())
    .update(Date.now().toString())
    .update(request.uri)
    .update('8dxuM7U!X*VyTLjY9CsZbeVSz*$c^Yi3')
  const rootFolder = '/files/onfly'
  const fileName = hash.digest('hex')
  const filePathname = rootFolder + '/' + fileName

  try {
    fs.writeFileSync(filePathname, request.requestBuffer)
  } catch (error) {
    request.return(500, "Error processing request: " + error.message)
    return
  }

  try {
    let backendResponse = await request.subrequest('/custom/'+processingOptions+'/plain/s-onfly/'+fileName, { body: '' })
    request.return(backendResponse.status, backendResponse.responseBuffer)
  } catch (error) {
    request.return(500, "Error processing file: " + error.message)
  } finally {
    fs.unlinkSync(filePathname)
  }
}

export default { handler }
